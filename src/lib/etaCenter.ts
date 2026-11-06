/**
 * Estimación de llegada al centro a partir de los pings GPS del bus.
 * Sin coste extra: solo usa los datos que ya se guardan en vehicle_location.
 */

export interface GpsPing {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface CenterEta {
  minutes: number;
  distanceKm: number;
  speedKmh: number;
  pingAgeSec: number;
}

const EARTH_KM = 6371;
const ROAD_FACTOR = 1.3; // la carretera es más larga que la línea recta
const MIN_SPEED = 12; // km/h
const MAX_SPEED = 45; // km/h
const DEFAULT_SPEED = 25; // km/h cuando no hay datos de movimiento
export const MAX_PING_AGE_SEC = 180; // más viejo que esto = sin señal

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Velocidad media real del bus con sus últimos pings (más recientes primero). */
function recentSpeedKmh(pings: GpsPing[]): number {
  if (pings.length < 2) return DEFAULT_SPEED;
  let km = 0;
  for (let i = 0; i < pings.length - 1; i++) km += haversineKm(pings[i], pings[i + 1]);
  const hours =
    (new Date(pings[0].timestamp).getTime() - new Date(pings[pings.length - 1].timestamp).getTime()) /
    3600000;
  if (hours <= 0) return DEFAULT_SPEED;
  const v = (km * ROAD_FACTOR) / hours;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));
}

/**
 * @param pings   pings del bus, el más reciente primero
 * @param center  coordenadas del centro
 * @returns null si no hay ping reciente (el llamador debe usar la hora prevista)
 */
export function estimateCenterEta(
  pings: GpsPing[],
  center: { lat: number; lng: number },
  now = Date.now()
): CenterEta | null {
  if (pings.length === 0) return null;
  const pingAgeSec = (now - new Date(pings[0].timestamp).getTime()) / 1000;
  if (!Number.isFinite(pingAgeSec) || pingAgeSec > MAX_PING_AGE_SEC) return null;

  const distanceKm = haversineKm(pings[0], center) * ROAD_FACTOR;
  const speedKmh = recentSpeedKmh(pings.slice(0, 4));
  const minutes = (distanceKm / speedKmh) * 60 - pingAgeSec / 60;
  return { minutes: Math.max(0, minutes), distanceKm, speedKmh, pingAgeSec };
}
