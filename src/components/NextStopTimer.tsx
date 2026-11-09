import { useEffect, useMemo, useState } from "react";
import { Bus, MapPin, Timer } from "lucide-react";
import { ScheduleSection } from "@/data/scheduleData";
import { useSchedule } from "@/context/ScheduleContext";

interface NextStopTimerProps {
  sections: (ScheduleSection | null | undefined)[];
}

const toMinutes = (time: string): number | null => {
  const [h, m] = time.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * Minutos que faltan para la recogida en la próxima parada pendiente.
 * La próxima parada es la primera, por hora, que aún no está marcada
 * como presente ni ausente. Se actualiza cada segundo.
 */
export const NextStopTimer = ({ sections }: NextStopTimerProps) => {
  const { getSelection } = useSchedule();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextStop = useMemo(() => {
    const trips = sections
      .flatMap((s) => s?.trips ?? [])
      .map((t) => ({ trip: t, minutes: toMinutes(t.time) }))
      .filter((x): x is { trip: (typeof x)["trip"]; minutes: number } => x.minutes !== null)
      .sort((a, b) => a.minutes - b.minutes);
    return trips.find((x) => getSelection(x.trip.id).status === "pending") ?? null;
    // `now` fuerza el recálculo cuando cambian las marcas de asistencia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, getSelection, now]);

  if (!nextStop) return null;

  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const diffSeconds = nextStop.minutes * 60 - nowSeconds;
  const late = diffSeconds < 0;
  const abs = Math.abs(diffSeconds);
  const mm = Math.floor(abs / 60);
  const ss = abs % 60;
  const display = `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;

  const tone = late
    ? "bg-red-50 border-red-300 text-red-700"
    : diffSeconds <= 5 * 60
      ? "bg-amber-50 border-amber-300 text-amber-700"
      : "bg-secondary/10 border-secondary/30 text-secondary";

  return (
    <div className={`rounded-xl border-2 p-4 ${tone}`} role="timer" aria-live="off">
      <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide">
        <Bus size={18} />
        <span>Hurrengo geralekua / Próxima parada</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 font-mono text-4xl font-extrabold">
        <Timer size={28} />
        <span>
          {late ? "+" : ""}
          {display}
        </span>
      </div>
      <div className="mt-1 text-center text-sm font-medium">
        {late ? `Retraso de ${Math.ceil(abs / 60)} min` : `Faltan ${Math.ceil(diffSeconds / 60)} min`} · {nextStop.trip.time}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-center text-sm">
        <MapPin size={14} />
        <span className="font-semibold">{nextStop.trip.user}</span>
        {nextStop.trip.location ? <span>· {nextStop.trip.location}</span> : null}
      </div>
    </div>
  );
};
