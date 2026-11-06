import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, Bus, Clock, MapPin, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErbi } from "@/integrations/supabase/erbiClient";
import { Button } from "@/components/ui/button";
import { estimateCenterEta, type GpsPing } from "@/lib/etaCenter";

/**
 * Seguimiento para el PERSONAL DEL CENTRO (ASPACE): hora prevista de
 * "Llegada al centro" y estimación en vivo según el GPS del bus.
 * Usa un enlace (tracking_tokens) de la ruta; no necesita pasajero.
 */

const REFRESH_MS = 20000;
const ETA_MAX_AGE_MS = 5 * 60000;

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

type TripRow = { scheduled_time: string; pickup_location: string | null; schedule_section: string; sort_order: number };

/** Misma regla que la tabla de rutas: hora de ZENTRO si existe; si no, última parada + 10 min. */
function arrivalFor(trips: TripRow[]): string | null {
  const zentro = trips.find((t) => /zentro|centro/i.test(t.pickup_location ?? ""));
  if (zentro) return zentro.scheduled_time.slice(0, 5);
  const last = trips[trips.length - 1];
  const m = last ? toMinutes(last.scheduled_time) : null;
  return m === null ? null : `${pad(Math.floor((m + 10) / 60))}:${pad((m + 10) % 60)}`;
}

const SeguimientoCentroAspace = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "invalid" | "ok">("loading");
  const [route, setRoute] = useState("");
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [hasCoords, setHasCoords] = useState(true);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [estimated, setEstimated] = useState<string | null>(null);
  const [delay, setDelay] = useState<number | null>(null);
  const [noSignal, setNoSignal] = useState(false);
  const [updated, setUpdated] = useState(new Date());
  const [busy, setBusy] = useState(false);

  const centerRef = useRef<{ lat: number; lng: number } | null>(null);
  const etaBase = useRef<{ min: number; at: number } | null>(null);
  const scheduledRef = useRef<string | null>(null);

  const render = useCallback(() => {
    const base = etaBase.current;
    if (!base || Date.now() - base.at > ETA_MAX_AGE_MS) {
      setEtaText(null);
      setEstimated(null);
      setDelay(null);
      return;
    }
    const left = Math.max(0, base.min - (Date.now() - base.at) / 60000);
    setEtaText(left <= 0.5 ? "Llegando" : `~${Math.ceil(left)} min`);
    const arrival = new Date(Date.now() + left * 60000);
    setEstimated(clock(arrival));
    const sched = scheduledRef.current ? toMinutes(scheduledRef.current) : null;
    setDelay(sched === null ? null : arrival.getHours() * 60 + arrival.getMinutes() - sched);
  }, []);

  const load = useCallback(async () => {
    if (!token) return setState("invalid");
    setBusy(true);
    try {
      const { data: tk } = await supabaseErbi
        .from("tracking_tokens")
        .select("route_name, is_active")
        .eq("token", token)
        .limit(1);
      const tkn = tk?.[0];
      if (!tkn || !tkn.is_active) return setState("invalid");
      setRoute(tkn.route_name);

      // Hora prevista: sección de mañana cuya llegada esté más cerca de ahora (hasta 30 min tarde)
      const { data: trips } = await supabase
        .from("schedule_trips")
        .select("scheduled_time, pickup_location, schedule_section, sort_order")
        .eq("route", tkn.route_name)
        .eq("is_active", true)
        .order("sort_order");
      const bySection = new Map<string, TripRow[]>();
      (trips ?? [])
        .filter((t) => t.schedule_section.toLowerCase().includes("morning"))
        .forEach((t) => bySection.set(t.schedule_section, [...(bySection.get(t.schedule_section) ?? []), t]));
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const arrivals = [...bySection.values()]
        .map(arrivalFor)
        .filter((a): a is string => !!a)
        .sort((a, b) => (toMinutes(a) ?? 0) - (toMinutes(b) ?? 0));
      const next = arrivals.find((a) => (toMinutes(a) ?? 0) >= nowMin - 30) ?? null;
      setScheduled(next);
      scheduledRef.current = next;

      // Coordenadas del centro (fila de stop_geocodes con "centro"/"zentro")
      if (!centerRef.current) {
        const { data: geo } = await supabase
          .from("stop_geocodes")
          .select("lat, lng, pickup_location")
          .eq("route_name", tkn.route_name)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .or("pickup_location.ilike.%centro%,pickup_location.ilike.%zentro%")
          .limit(1);
        const g = geo?.[0];
        if (g && g.lat !== null && g.lng !== null) centerRef.current = { lat: g.lat, lng: g.lng };
      }
      setHasCoords(!!centerRef.current);

      // Pings recientes del bus
      if (centerRef.current) {
        const { data: pings } = await supabase
          .from("vehicle_location")
          .select("lat, lng, timestamp")
          .eq("route_name", tkn.route_name)
          .order("timestamp", { ascending: false })
          .limit(5);
        const eta = estimateCenterEta((pings ?? []) as GpsPing[], centerRef.current);
        if (eta) {
          const prev = etaBase.current;
          let m = eta.minutes;
          // Suaviza subidas bruscas respecto a la cuenta atrás anterior
          if (prev && Date.now() - prev.at < ETA_MAX_AGE_MS) {
            const projected = Math.max(0, prev.min - (Date.now() - prev.at) / 60000);
            if (m > projected + 2) m = projected + (m - projected) * 0.5;
          }
          etaBase.current = { min: m, at: Date.now() };
          setNoSignal(false);
        } else {
          setNoSignal(!etaBase.current || Date.now() - etaBase.current.at > ETA_MAX_AGE_MS);
        }
      }
      setState("ok");
      setUpdated(new Date());
      render();
    } finally {
      setBusy(false);
    }
  }, [token, render]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), REFRESH_MS);
    const tick = setInterval(render, 15000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, render]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground text-2xl font-bold">Cargando...</div>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border-2 border-border rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <AlertCircle className="mx-auto text-destructive mb-6" size={64} />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">Enlace no válido</h1>
          <p className="text-muted-foreground text-lg">Este enlace no existe o no está activo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 pt-6">
      <div className="bg-card border-2 border-border rounded-3xl p-8 text-center max-w-sm w-full shadow-xl">
        <h2 className="text-lg uppercase tracking-widest text-muted-foreground mb-6 font-bold">
          Llegada al centro · {route}
        </h2>

        <div className="bg-primary/10 border-4 border-primary/30 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
          <Bus className="text-primary" size={60} />
        </div>

        {scheduled ? (
          <p className="text-xl text-muted-foreground font-medium mb-4">
            Hora prevista: <span className="font-mono font-extrabold text-foreground">{scheduled}</span>
          </p>
        ) : (
          <p className="text-xl text-muted-foreground font-medium mb-4">Sin llegadas pendientes.</p>
        )}

        {etaText && (
          <div className="flex items-center justify-center gap-3 text-foreground bg-primary/10 border-2 border-primary/20 rounded-2xl px-6 py-4 mb-4">
            <Clock size={30} className="text-primary shrink-0" />
            <span className="font-mono font-extrabold text-4xl">{etaText}</span>
          </div>
        )}

        {estimated && (
          <p className="text-xl font-medium text-foreground">
            Llegada estimada: <span className="font-mono font-extrabold">{estimated}</span>
          </p>
        )}

        {delay !== null && (
          <p className={`text-xl font-bold mt-2 ${delay > 5 ? "text-destructive" : "text-primary"}`}>
            {delay > 5 ? `Retraso de ~${delay} min` : delay < -5 ? `Adelantado ~${-delay} min` : "A tiempo"}
          </p>
        )}

        {!etaText && noSignal && (
          <p className="flex items-center justify-center gap-2 text-muted-foreground text-lg mt-2">
            <MapPin size={22} /> Sin señal GPS reciente. Se muestra la hora prevista.
          </p>
        )}
        {!hasCoords && (
          <p className="text-muted-foreground text-base mt-2">
            Falta registrar la ubicación del centro para calcular la llegada por GPS.
          </p>
        )}

        <p className="text-base text-muted-foreground mt-8">Actualizado: {clock(updated)}</p>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy} className="mt-4 w-full gap-2">
          <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
          {busy ? "Actualizando…" : "Actualizar ahora"}
        </Button>
      </div>
    </div>
  );
};

export default SeguimientoCentroAspace;
