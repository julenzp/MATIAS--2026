import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErbi } from "@/integrations/supabase/erbiClient";
import { MapPin, Clock, AlertCircle, Bus, Volume2, Download, Smartphone, Bell, RefreshCw } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAlertSound } from "@/hooks/useAlertSound";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TrackingStatus = "loading" | "invalid" | "inactive" | "en_curso" | "preparate" | "completado";

// ── Subcomponents ──────────────────────────────────────────────────────────────

type InstallSectionProps = {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isInstalling: boolean;
  onInstall: () => void;
};

const InstallSection = ({
  isInstalled,
  canInstall,
  isInstalling,
  onInstall,
  token,
}: InstallSectionProps & { token?: string }) => {
  if (isInstalled) return null;

  // En TODOS los casos (iOS y Android), navegar a pwa-tracking.html
  // para que la URL en la barra de direcciones sea la correcta.
  // iOS guarda la URL de la barra, NO el start_url del manifest.
  const handleInstallClick = () => {
    if (canInstall) {
      // Android: intentar el prompt nativo primero
      onInstall();
    } else if (token) {
      // iOS / Fallback: navegar a pwa-tracking.html con instrucciones
      window.location.href = `/pwa-tracking.html?t=${token}`;
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-border">
      <Button
        onClick={handleInstallClick}
        disabled={isInstalling}
        size="lg"
        className="w-full gap-3 font-extrabold text-xl h-20 rounded-2xl shadow-lg"
      >
        <Smartphone size={28} />
        {isInstalling ? "Instalando…" : "📲 Instalar en mi móvil"}
      </Button>
      <p className="text-center text-base text-muted-foreground mt-3">
        Se instala directamente — sin buscar el enlace cada día
      </p>
    </div>
  );
};

const IOSDialog = ({
  open,
  onOpenChange,
  isIOS,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isIOS: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle className="text-2xl text-center">📲 Guardar en tu móvil</DialogTitle>
      </DialogHeader>

      {isIOS ? (
        /* iPhone instructions */
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">⬆️</span>
            <p className="text-lg font-bold leading-tight">Pulsa el botón de <strong>Compartir</strong> abajo en Safari</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">➕</span>
            <p className="text-lg font-bold leading-tight">Pulsa <strong>"Añadir a inicio"</strong></p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">✅</span>
            <p className="text-lg font-bold leading-tight">Pulsa <strong>"Añadir"</strong> — ¡listo!</p>
          </div>
        </div>
      ) : (
        /* Android instructions */
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">⋮</span>
            <p className="text-lg font-bold leading-tight">Pulsa los <strong>tres puntos</strong> arriba a la derecha</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">➕</span>
            <p className="text-lg font-bold leading-tight">Pulsa <strong>"Añadir a pantalla de inicio"</strong></p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
            <span className="text-5xl">✅</span>
            <p className="text-lg font-bold leading-tight">Pulsa <strong>"Añadir"</strong> — ¡listo!</p>
          </div>
        </div>
      )}

      <Button className="w-full text-xl font-bold py-6 mt-2 rounded-2xl" onClick={() => onOpenChange(false)}>
        Entendido
      </Button>
    </DialogContent>
  </Dialog>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const SeguimientoAspace = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [passengerName, setPassengerName] = useState("");
  const [etaRange, setEtaRange] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showIOSDialog, setShowIOSDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [alertScopeKey, setAlertScopeKey] = useState("");
  const prevStatusRef = useRef<TrackingStatus>("loading");
  const alertPlayedRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const { isUnlocked: isAudioUnlocked, play: playAlertSound, unlockAndPlay } = useAlertSound();
  const { isIOS, isInstalled, canInstall, install, isInstalling } = usePWAInstall();
  const { isSubscribed, isSupported: pushSupported, permission: pushPermission, isLoading: pushLoading, subscribe: subscribePush } = usePushSubscription(token, "ASPACE");
  const [pushPromptDismissed, setPushPromptDismissed] = useState(false);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  CAPA 2: Guardar token en localStorage para recovery               ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  useEffect(() => {
    if (!token) return;
    try {
      localStorage.setItem("erbi:tracking_token", token);
      localStorage.setItem("erbi:tracking_last_visit", Date.now().toString());
    } catch { /* localStorage no disponible */ }
  }, [token]);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  CAPA 2.5: Respaldo - Enmascarar URL a /t/TOKEN                    ║
  // ║  La capa principal está en index.html (se ejecuta antes de React).  ║
  // ║  Este useEffect es solo un respaldo por si index.html no lo hizo.  ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  useEffect(() => {
    if (!token) return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;
    if (window.location.pathname === `/t/${token}`) return;

    try {
      const newUrl = `/t/${token}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", newUrl);
      console.log("[Tracking] URL masked to:", newUrl);
    } catch {
      // Silenciar
    }
  }, [token]);

  // Auto-subscribe to push if permission was already granted but no subscription exists
  useEffect(() => {
    if (!pushLoading && pushSupported && !isSubscribed && pushPermission === "granted" && token) {
      subscribePush();
    }
  }, [pushLoading, pushSupported, isSubscribed, pushPermission, token]);

  // Inject a dynamic manifest so the installed PWA opens this exact token URL.
  // CRITICAL: Solo inyectar si el token es válido y activo para no interferir
  // con la instalación de otras PWAs (rutas).
  // Usamos un estado para saber si el token es válido antes de inyectar.
  const [tokenIsValid, setTokenIsValid] = useState(false);

  useEffect(() => {
    if (!token || !tokenIsValid) return;

    // CRÍTICO: start_url usa /pwa-tracking.html?t=TOKEN
    // Este archivo está EXCLUIDO del Service Worker por la regla
    // /^\/pwa-.*\.html$/ en navigateFallbackDenylist, así que
    // SIEMPRE se descarga fresco del servidor. Nunca se sirve
    // desde cache, eliminando el problema de index.html cacheado
    // sin el script de redirect.
    const trackingUrl = `${window.location.origin}/pwa-tracking.html?t=${token}`;

    const manifest = {
      id: `/seguimiento-aspace/${token}`,
      name: "Seguimiento ERBI",
      short_name: "Seguimiento",
      description: "Seguimiento de recogida en tiempo real",
      theme_color: "#0f172a",
      background_color: "#0f172a",
      display: "standalone",
      orientation: "portrait",
      start_url: trackingUrl,
      scope: window.location.origin + "/",
      icons: [
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);

    // Remove any existing manifest link (from vite-plugin-pwa)
    const existingLinks = document.querySelectorAll("link[rel='manifest']");
    const savedHrefs = Array.from(existingLinks).map((el) => (el as HTMLLinkElement).href);
    existingLinks.forEach((el) => el.remove());

    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = blobUrl;
    document.head.appendChild(link);

    return () => {
      URL.revokeObjectURL(blobUrl);
      // Restaurar los manifests originales al desmontar para no interferir
      // con otras PWAs
      link.remove();
      for (const href of savedHrefs) {
        if (href && !href.startsWith("blob:")) {
          const restored = document.createElement("link");
          restored.rel = "manifest";
          restored.href = href;
          document.head.appendChild(restored);
        }
      }
    };
  }, [token, tokenIsValid]);

  useEffect(() => {
    // Reset alert state when scope changes (different user/token)
    alertPlayedRef.current = false;
    prevStatusRef.current = "loading";
  }, [alertScopeKey]);

  // Main alert trigger: when status becomes "preparate"
  useEffect(() => {
    const triggerAlerts = async () => {
      if (status !== "preparate") {
        alertPlayedRef.current = false;
        prevStatusRef.current = status;
        return;
      }

      if (prevStatusRef.current !== "preparate" || !alertPlayedRef.current) {
        const played = await playAlertSound();
        alertPlayedRef.current = played;
      }

      prevStatusRef.current = status;
    };

    void triggerAlerts();
  }, [status, playAlertSound]);

  // Repeat alert every 30s while in "preparate" state
  useEffect(() => {
    if (status !== "preparate") return;

    const repeatId = window.setInterval(() => {
      void playAlertSound();
    }, 20000);

    return () => window.clearInterval(repeatId);
  }, [status, playAlertSound]);

  // Listen for push notifications from service worker and play sound immediately
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "ERBI_PUSH_ALERT") {
        console.log("[Tracking] Push alert received from SW, playing sound");
        void playAlertSound();
        // Also force refresh to update status
        setLastRefresh(new Date());
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      }
    };
  }, [playAlertSound]);

  const refreshNow = useCallback(() => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
    window.setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  // Recarga por timer cada 20 segundos (más rápido)
  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 20000);
    return () => clearInterval(interval);
  }, []);

  // Al volver a primer plano, forzar refresco inmediato.
  useEffect(() => {
    const onFocus = () => setLastRefresh(new Date());
    const onVisibility = () => {
      if (document.visibilityState === "visible") setLastRefresh(new Date());
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Pull-to-refresh para móvil
  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0) return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartYRef.current === null || window.scrollY > 0) return;
      const delta = (event.touches[0]?.clientY ?? 0) - touchStartYRef.current;
      if (delta <= 0) return;

      const capped = Math.min(delta, 120);
      pullDistanceRef.current = capped;
      setPullDistance(capped);
      setIsPulling(capped > 8);
    };

    const onTouchEnd = () => {
      if (pullDistanceRef.current >= 80) refreshNow();
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsPulling(false);
      touchStartYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [refreshNow]);

  // Suscripción realtime a attendance_records para reaccionar inmediatamente
  // cuando el conductor marca una parada, sin esperar al timer
  // Store route_name from token for realtime filtering
  const [routeName, setRouteName] = useState<string>("");

  useEffect(() => {
    if (!token || !routeName) return;

    const channel = supabaseErbi
      .channel(`tracking-attendance-${routeName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `route=eq.${routeName}`,
        },
        () => {
          // Recarga inmediata al detectar cambio en ESTA ruta
          setLastRefresh(new Date());
        }
      )
      .subscribe();

    return () => {
      supabaseErbi.removeChannel(channel);
    };
  }, [token, routeName]);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setIsRefreshing(false);
      return;
    }
    loadTracking().finally(() => setIsRefreshing(false));
  }, [token, lastRefresh]);

  // Estado para determinar si el servicio de mañana ha terminado
  // basándose en si todas las paradas de mañana están completadas,
  // NO en un horario fijo como las 13:30.
  const [morningCompleted, setMorningCompleted] = useState(false);

  // Fallback: si antes de las 10:00 aún no hay datos, asumimos mañana.
  // Si después de las 16:00 y no hay datos de tarde, asumimos completado.
  const getIsMorning = () => {
    // Si sabemos que la mañana está completada, NO es mañana
    if (morningCompleted) return false;
    // Si aún no sabemos (primer render), usar hora como hint inicial
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return totalMinutes < 15 * 60; // Fallback generoso: antes de las 15:00
  };

  const getMinutesToScheduledTime = (time: string) => {
    const [hoursRaw, minutesRaw] = time.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    return Math.round((scheduled.getTime() - now.getTime()) / 60000);
  };

  const loadTracking = async () => {
    if (!token) return;

    const { data: tknArray, error } = await supabaseErbi
      .from("tracking_tokens")
      .select("id, route_name, passenger_id, passenger_name, is_active")
      .eq("token", token)
      .eq("is_active", true);

    const tkn = Array.isArray(tknArray) && tknArray.length > 0 ? tknArray[0] : null;

    if (error || !tkn) {
      setStatus("invalid");
      setTokenIsValid(false);
      return;
    }
    if (!tkn.is_active) {
      setStatus("inactive");
      setTokenIsValid(false);
      return;
    }

    // Token válido y activo: permitir inyección de manifest
    setTokenIsValid(true);
    // Store route name for realtime filtering
    setRouteName(tkn.route_name);

    // Scope para que las alertas se reinicien correctamente por token/pasajero.
    setAlertScopeKey(`${tkn.id}:${tkn.route_name}:${tkn.passenger_id ?? ""}`);

    let pName = tkn.passenger_name || "";
    if (tkn.passenger_id) {
      const { data: p } = await supabaseErbi
        .from("passengers")
        .select("name")
        .eq("id", tkn.passenger_id)
        .maybeSingle();
      if (p) pName = p.name;
    }
    setPassengerName(pName);

    const today = new Date().toISOString().slice(0, 10);

    let tripsQuery = supabaseErbi
      .from("schedule_trips")
      .select("id, scheduled_time, pickup_location, sort_order, schedule_section")
      .eq("route", tkn.route_name)
      .eq("is_active", true);

    if (tkn.passenger_id) tripsQuery = tripsQuery.eq("passenger_id", tkn.passenger_id);

    const { data: passengerTrips } = await tripsQuery.order("sort_order");

    if (!passengerTrips || passengerTrips.length === 0) { setStatus("en_curso"); return; }

    // Check if ALL morning trips for this passenger are finalized
    // to determine morning/afternoon dynamically instead of using clock
    const FINAL_STATUSES = ["acudido", "recogido", "no_acudido", "present", "absent"];

    const { data: attendanceToday } = await supabaseErbi
      .from("attendance_records")
      .select("id, status, trip_id")
      .eq("record_date", today)
      .eq("route", tkn.route_name);

    const completedTripIds = new Set(
      (attendanceToday || [])
        .filter((a) => FINAL_STATUSES.includes(a.status))
        .map((a) => a.trip_id)
    );

    const morningTrips = passengerTrips.filter((t) =>
      t.schedule_section.toLowerCase().includes("morning")
    );
    const afternoonTrips = passengerTrips.filter((t) =>
      t.schedule_section.toLowerCase().includes("afternoon")
    );

    // Morning is completed if ALL morning trips are finalized
    const allMorningDone = morningTrips.length > 0 &&
      morningTrips.every((t) => completedTripIds.has(t.id));

    if (allMorningDone && !morningCompleted) {
      setMorningCompleted(true);
    }

    // Choose which trips are relevant based on completion state
    const isMorning = getIsMorning();
    const relevantTrips = isMorning ? morningTrips : afternoonTrips;

    if (relevantTrips.length === 0) { setStatus("completado"); return; }

    // If all relevant trips are done, show completed
    const allRelevantDone = relevantTrips.every((t) => completedTripIds.has(t.id));
    if (allRelevantDone) { setStatus("completado"); return; }

    const targetTrip = relevantTrips[0];
    setPickupLocation(targetTrip.pickup_location);

    // Re-use attendanceToday already fetched above
    const relevantTripIds = new Set(relevantTrips.map((t) => t.id));
    const relevantAttendance = (attendanceToday || []).filter((a) => relevantTripIds.has(a.trip_id));

    const targetScheduledEta = targetTrip.scheduled_time
      ? getMinutesToScheduledTime(targetTrip.scheduled_time)
      : null;

    // Fallback robusto sin GPS: si estamos cerca de la hora prevista,
    // mantenemos "¡Prepárate!" incluso si el bus viene con retraso.
    // (hasta 30 min después de la hora prevista)
    const isWithinPrepareWindow =
      targetScheduledEta !== null && targetScheduledEta <= 8 && targetScheduledEta >= -30;

    if (isWithinPrepareWindow) {
      setEtaRange(targetScheduledEta <= 0 ? "Llegando" : `~${targetScheduledEta} min`);
      setStatus("preparate");
      return;
    }

    // El periodo está completado si la parada del pasajero ya tiene estado final
    const targetTripFinalized = relevantAttendance.some(
      (a) => a.trip_id === targetTrip.id && FINAL_STATUSES.includes(a.status)
    );
    if (targetTripFinalized) { setStatus("completado"); return; }

    // Obtener todos los viajes de la sección para calcular posición relativa del bus
    const { data: allSectionTrips } = await supabase
      .from("schedule_trips")
      .select("id, scheduled_time, pickup_location, sort_order, schedule_section")
      .eq("route", tkn.route_name)
      .eq("schedule_section", targetTrip.schedule_section)
      .eq("is_active", true)
      .order("sort_order");

    const targetIndex = (allSectionTrips || []).findIndex((t) => t.id === targetTrip.id);

    // Calcular cuántas paradas previas ya han sido completadas
    let lastCompletedIndex = -1;
    if (allSectionTrips) {
      for (let i = 0; i < allSectionTrips.length; i++) {
        if (completedTripIds.has(allSectionTrips[i].id)) lastCompletedIndex = i;
      }
    }

    if (lastCompletedIndex >= 0 && lastCompletedIndex >= targetIndex) { setStatus("completado"); return; }

    // Parada inmediatamente anterior ya completada → bus muy cerca
    const previousStopCompleted = allSectionTrips && targetIndex > 0
      ? completedTripIds.has(allSectionTrips[targetIndex - 1].id)
      : false;

    if (previousStopCompleted) {
      try {
        const { data: etaData, error: etaError } = await supabase.functions.invoke("calculate-eta", {
          body: { route_name: tkn.route_name, passenger_id: tkn.passenger_id },
        });
        if (!etaError && etaData && etaData.eta_minutes !== null) setEtaRange(`~${etaData.eta_minutes} min`);
        else setEtaRange("~1-3 min");
      } catch { setEtaRange("~1-3 min"); }
      setStatus("preparate");
      return;
    }

    // Intentar calcular ETA por GPS
    try {
      const { data: etaData, error: etaError } = await supabase.functions.invoke("calculate-eta", {
        body: { route_name: tkn.route_name, passenger_id: tkn.passenger_id },
      });
      if (!etaError && etaData && etaData.eta_minutes !== null) {
        const eta = etaData.eta_minutes;
        setEtaRange(`~${eta} min`);
        // Umbral: ≤ 8 min → ¡Prepárate!
        setStatus(eta <= 8 ? "preparate" : "en_curso");
        return;
      }
    } catch { /* fall through */ }

    // Sin GPS: usar fallback por paradas completadas o hora programada
    if (lastCompletedIndex >= 0) {
      const stopsAway = targetIndex - lastCompletedIndex - 1;
      // Estimar ~4 min por parada (más realista que 3)
      const fallbackEta = Math.max(1, stopsAway * 4);
      setEtaRange(`~${fallbackEta} min`);
      if (fallbackEta <= 8) { setStatus("preparate"); return; }
    } else if (targetTrip.scheduled_time) {
      // Sin ninguna parada completada: mostrar hora programada como referencia
      setEtaRange(`Previsto ~${targetTrip.scheduled_time}`);
    }

    setStatus("en_curso");
  };

  const installProps = {
    isInstalled,
    canInstall,
    isIOS,
    isInstalling,
    onInstall: install,
    token,
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground text-2xl font-bold">Cargando...</div>
      </div>
    );
  }

  if (status === "invalid") {
    if (isInstalled) {
      return (
        <div className="min-h-screen bg-neutral-200 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-6xl mb-4">🚐</div>
          <h1 className="text-3xl font-extrabold text-neutral-500 mb-3">Sin servicio programado</h1>
          <p className="text-lg text-neutral-500">No hay ninguna ruta de seguimiento activa en este momento.</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border-2 border-border rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <AlertCircle className="mx-auto text-destructive mb-6" size={64} />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">Enlace no válido</h1>
          <p className="text-muted-foreground text-lg">Este enlace de seguimiento no existe o ha sido eliminado.</p>
        </div>
      </div>
    );
  }

  if (status === "inactive") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border-2 border-border rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <AlertCircle className="mx-auto text-accent mb-6" size={64} />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">Enlace no activo</h1>
          <p className="text-muted-foreground text-lg">El seguimiento para este usuario no está activado actualmente.</p>
        </div>
      </div>
    );
  }

  if (status === "completado") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border-2 border-border rounded-3xl p-10 text-center max-w-sm w-full shadow-xl">
          <div className="bg-muted rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-6">
            <Bus className="text-muted-foreground" size={56} />
          </div>
          <h1 className="text-3xl font-extrabold text-muted-foreground mb-3">Sin servicio programado</h1>
          <p className="text-muted-foreground text-lg">No hay recogidas pendientes en este momento.</p>
          <InstallSection {...installProps} />
        </div>
        <IOSDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} isIOS={isIOS} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 pt-6">
      {isPulling && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-border bg-card px-4 py-2 shadow-md text-sm font-semibold text-foreground">
          {pullDistance >= 80 ? "↻ Suelta para actualizar" : "↓ Desliza para actualizar"}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BANNER GIGANTE "EL AUTOBÚS ESTÁ LLEGANDO" — siempre visible
          cuando status === "preparate", incluso sin audio
          ══════════════════════════════════════════════════════════════════ */}
      {status === "preparate" && (
        <div className="w-full max-w-sm mb-4 rounded-3xl border-4 border-accent bg-accent/20 p-6 text-center animate-pulse shadow-2xl">
          <div className="text-6xl mb-2">🚌</div>
          <h1 className="text-3xl sm:text-4xl font-black text-accent leading-tight">
            ¡EL AUTOBÚS ESTÁ LLEGANDO!
          </h1>
          {passengerName && (
            <p className="text-2xl font-bold text-foreground mt-2">{passengerName}</p>
          )}
          {etaRange && (
            <div className="flex items-center justify-center gap-3 text-foreground bg-accent/10 border-2 border-accent/30 rounded-2xl px-6 py-4 mt-4">
              <Clock size={30} className="text-accent shrink-0" />
              <span className="font-mono font-extrabold text-4xl">{etaRange}</span>
            </div>
          )}
          {pickupLocation && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xl mt-3">
              <MapPin size={24} />
              <span className="font-medium">{pickupLocation}</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BANNER PUSH NOTIFICATIONS — Prominente, imposible de ignorar
          Se muestra ANTES del botón de sonido para máxima visibilidad
          ══════════════════════════════════════════════════════════════════ */}
      {pushSupported && !isSubscribed && !pushLoading && !pushPromptDismissed && pushPermission !== "denied" && (
        <div className="w-full max-w-sm mb-4 rounded-3xl border-4 border-primary bg-card p-6 text-center shadow-2xl">
          <div className="text-5xl mb-3">🔔</div>
          <h2 className="text-2xl font-black text-foreground mb-2">
            Activa las notificaciones
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            Te avisaremos con una alarma cuando el bus esté llegando a tu parada
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full text-2xl font-black h-20 rounded-2xl gap-3 shadow-xl"
            onClick={async () => {
              const ok = await subscribePush();
              if (!ok) setPushPromptDismissed(true);
            }}
          >
            <Bell size={32} />
            🔔 ACTIVAR NOTIFICACIONES
          </Button>
          <button
            onClick={() => setPushPromptDismissed(true)}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ahora no
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BOTÓN DE ACTIVAR SONIDO — LO PRIMERO que se ve si no está activo.
          Grande, imposible de ignorar, con animación.
          ══════════════════════════════════════════════════════════════════ */}
      {!isAudioUnlocked && (
        <div className="w-full max-w-sm mb-4 rounded-3xl border-4 border-accent bg-card p-6 text-center shadow-2xl animate-bounce">
          <div className="text-5xl mb-3">🔔</div>
          <h2 className="text-2xl font-black text-foreground mb-2">
            Activa el sonido
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            Pulsa aquí para que suene cuando llegue el bus
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full text-2xl font-black h-20 rounded-2xl gap-3 shadow-xl"
            onClick={() => void unlockAndPlay()}
          >
            <Volume2 size={32} />
            🔊 ACTIVAR SONIDO
          </Button>
          {isIOS && (
            <p className="text-sm text-muted-foreground mt-3">
              En iPhone la vibración no funciona, pero el sonido sí.
            </p>
          )}
        </div>
      )}

      {/* Audio unlocked confirmation */}
      {isAudioUnlocked && status !== "preparate" && (
        <div className="w-full max-w-sm mb-4 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <Volume2 size={22} className="text-primary shrink-0" />
          <span className="text-base font-bold text-primary">Sonido activado ✓</span>
        </div>
      )}

      {/* ── Main card ── */}
      <div className="bg-card border-2 border-border rounded-3xl p-8 text-center max-w-sm w-full shadow-xl">
        <h2 className="text-lg uppercase tracking-widest text-muted-foreground mb-6 font-bold">
          Seguimiento ASPACE
        </h2>

        {status === "preparate" ? (
          <>
            <div className="bg-accent/20 border-4 border-accent rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Bus className="text-accent" size={60} />
            </div>
            <h1 className="text-5xl font-extrabold text-accent mb-3">¡Prepárate!</h1>
            {passengerName && <p className="text-foreground text-3xl font-bold mb-4">{passengerName}</p>}
            {etaRange && (
              <div className="flex items-center justify-center gap-3 text-foreground bg-accent/10 border-2 border-accent/30 rounded-2xl px-6 py-4 mb-4">
                <Clock size={30} className="text-accent shrink-0" />
                <span className="font-mono font-extrabold text-4xl">{etaRange}</span>
              </div>
            )}
            {pickupLocation && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-xl mt-2">
                <MapPin size={24} />
                <span className="font-medium">{pickupLocation}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-primary/10 border-4 border-primary/30 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
              <Bus className="text-primary" size={60} />
            </div>
            <h1 className="text-4xl font-extrabold text-primary mb-3">Ruta en curso</h1>
            {passengerName && <p className="text-foreground text-3xl font-bold mb-4">{passengerName}</p>}
            {etaRange && (
              <div className="flex items-center justify-center gap-3 text-foreground bg-primary/10 border-2 border-primary/20 rounded-2xl px-6 py-4 mb-4">
                <Clock size={30} className="text-primary shrink-0" />
                <span className="font-mono font-extrabold text-4xl">{etaRange}</span>
              </div>
            )}
            <p className="text-muted-foreground text-xl font-medium">Te avisaremos cuando el autobús esté cerca.</p>
          </>
        )}

        <p className="text-base text-muted-foreground mt-8">
          Actualizado: {lastRefresh.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {/* Refresh + test buttons */}
        <Button
          type="button"
          variant="outline"
          onClick={refreshNow}
          disabled={isRefreshing}
          className="mt-4 w-full gap-2"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Actualizando…" : "Actualizar ahora"}
        </Button>

        <button
          onClick={() => void unlockAndPlay()}
          className="mt-4 flex items-center gap-2 mx-auto text-base text-muted-foreground hover:text-foreground transition-colors px-5 py-3 rounded-xl bg-muted hover:bg-muted/80 border border-border font-medium"
        >
          <Volume2 size={20} />
          {isAudioUnlocked ? "✅ Probar sonido" : "🔊 Activar y probar sonido"}
        </button>

      {/* Push Notifications - inline compact */}
        {isSubscribed && (
          <div className="mt-3 flex items-center gap-2 justify-center text-base text-primary font-medium">
            <Bell size={18} />
            Notificaciones activadas ✓
          </div>
        )}
        {pushSupported && pushPermission === "denied" && !isSubscribed && (
          <p className="mt-2 text-sm text-destructive text-center">
            Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.
          </p>
        )}

        <InstallSection {...installProps} />
      </div>

      <IOSDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} isIOS={isIOS} />
    </div>
  );
};

export default SeguimientoAspace;
