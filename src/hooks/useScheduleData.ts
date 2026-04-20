import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TripEntry, ScheduleSection, userContacts } from '@/data/scheduleData';

type ScheduleTrip = {
  id: string;
  passenger_id: string | null;
  schedule_section: string;
  scheduled_time: string;
  pickup_location: string | null;
  sort_order: number;
  is_active: boolean;
  route: string;
  // Uses passengers_public view (no contact info) so it works for ALL users (anon, matia, admin)
  passengers_public?: {
    id: string;
    name: string;
    location: string | null;
    trip_type: string | null;
    registration_number: number | null;
  };
};

// Map schedule_section to display titles (soporta secciones dinámicas por ruta)
const SECTION_TITLES: Record<string, { titleEu: string; titleEs: string }> = {
  // MATIA (legacy)
  'morning_first': { titleEu: 'Goizeko lehenengo bidaia', titleEs: 'Primer viaje mañanas' },
  'morning_second': { titleEu: 'Goizeko bigarren bidaia', titleEs: 'Segundo viaje mañanas' },
  'afternoon_first': { titleEu: 'Arratsaldeko lehenengo bidaia', titleEs: 'Primer viaje tardes' },
  'afternoon_second': { titleEu: 'Arratsaldeko bigarren bidaia', titleEs: 'Segundo viaje tardes' },
  // ASPACE
  'ASPACE_MORNING_1': { titleEu: 'Goizeko lehenengo bidaia', titleEs: 'Primer viaje mañanas' },
  'ASPACE_MORNING_2': { titleEu: 'Goizeko bigarren bidaia', titleEs: 'Segundo viaje mañanas' },
  'ASPACE_AFTERNOON_1': { titleEu: 'Arratsaldeko lehenengo bidaia', titleEs: 'Primer viaje tardes' },
  'ASPACE_AFTERNOON_2': { titleEu: 'Arratsaldeko bigarren bidaia', titleEs: 'Segundo viaje tardes' },
  // AMARAEN FINDE
  'AMARAEN_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'AMARAEN_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'AMARAEN_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'AMARAEN_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  // EGURTZEGI
  'EGURTZEGI_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'EGURTZEGI_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'EGURTZEGI_MORNING_3': { titleEu: 'Goizeko 3. bidaia', titleEs: '3º viaje mañanas' },
  'EGURTZEGI_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'EGURTZEGI_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  'EGURTZEGI_AFTERNOON_3': { titleEu: 'Arratsaldeko 3. bidaia', titleEs: '3º viaje tardes' },
  // EGILUZE HONDARRIBIA
  'EGILUZE_MORNING_1': { titleEu: 'Goizeko bidaia', titleEs: 'Viaje mañanas' },
  'EGILUZE_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia (14:45)', titleEs: '1º viaje tardes (14:45)' },
  'EGILUZE_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia (16:00)', titleEs: '2º viaje tardes (16:00)' },
  // BERMINGHAM
  'BERMINGHAM_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'BERMINGHAM_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'BERMINGHAM_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'BERMINGHAM_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  // LASARTE
  'LASARTE_MORNING_1': { titleEu: 'Goizeko bidaia', titleEs: 'Viaje mañanas' },
  'LASARTE_AFTERNOON_1': { titleEu: 'Arratsaldeko bidaia', titleEs: 'Viaje tardes' },
  // LAMOROUSE
  'LAMOROUSE_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'LAMOROUSE_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'LAMOROUSE_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'LAMOROUSE_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  // IGELDO
  'IGELDO_MORNING_1': { titleEu: 'Goizeko bidaia', titleEs: 'Viaje mañanas' },
  'IGELDO_AFTERNOON_1': { titleEu: 'Arratsaldeko bidaia', titleEs: 'Viaje tardes' },
  // FRAISORO
  'FRAISORO_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'FRAISORO_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'FRAISORO_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'FRAISORO_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  // FRAISORO_2
  'FRAISORO_2_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'FRAISORO_2_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'FRAISORO_2_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'FRAISORO_2_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  // ARGIXAO_1
  'ARGIXAO_1_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'ARGIXAO_1_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'ARGIXAO_1_MORNING_3': { titleEu: 'Goizeko 3. bidaia', titleEs: '3º viaje mañanas' },
  'ARGIXAO_1_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'ARGIXAO_1_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
  'ARGIXAO_1_AFTERNOON_3': { titleEu: 'Arratsaldeko 3. bidaia', titleEs: '3º viaje tardes' },
  // ARGIXAO_2
  'ARGIXAO_2_MORNING_1': { titleEu: 'Goizeko 1. bidaia', titleEs: '1º viaje mañanas' },
  'ARGIXAO_2_MORNING_2': { titleEu: 'Goizeko 2. bidaia', titleEs: '2º viaje mañanas' },
  'ARGIXAO_2_AFTERNOON_1': { titleEu: 'Arratsaldeko 1. bidaia', titleEs: '1º viaje tardes' },
  'ARGIXAO_2_AFTERNOON_2': { titleEu: 'Arratsaldeko 2. bidaia', titleEs: '2º viaje tardes' },
};

const FETCH_TIMEOUT_MS = 12_000;

const withTimeout = async <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
};

// Helper to convert time string to minutes for sorting
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

// Transform database trips to display format
const transformTripsToSection = (trips: ScheduleTrip[], section: string): ScheduleSection => {
  const sectionTrips = trips
    .filter(t => t.schedule_section === section && t.is_active)
    // Sort primarily by scheduled_time, then by sort_order as tiebreaker
    .sort((a, b) => {
      const timeA = timeToMinutes(a.scheduled_time);
      const timeB = timeToMinutes(b.scheduled_time);
      if (timeA !== timeB) return timeA - timeB;
      return a.sort_order - b.sort_order;
    });

  let passengerCounter = 0;
  const transformedTrips: TripEntry[] = sectionTrips.map((trip) => {
    const passenger = trip.passengers_public;
    const isZentro = !passenger && !!trip.pickup_location;
    const userName = passenger?.name || (isZentro ? `ZENTRO` : 'Sin asignar');

    // ZENTRO markers don't get a correlative number; real passengers do
    if (!isZentro) passengerCounter++;

    return {
      id: trip.id,
      time: trip.scheduled_time,
      user: userName,
      location: trip.pickup_location || passenger?.location || '',
      type: (passenger?.trip_type as 'S' | 'B' | '') || '',
      contact: userContacts[userName] || undefined,
      // ZENTRO gets 0 (won't be displayed); passengers get correlative 1, 2, 3...
      registrationNumber: isZentro ? 0 : passengerCounter,
      // Include passenger ID for linking with notes
      passengerId: trip.passenger_id || undefined,
    };
  });

  return {
    titleEu: SECTION_TITLES[section]?.titleEu || section,
    titleEs: SECTION_TITLES[section]?.titleEs || section,
    trips: transformedTrips,
  };
};

type UseScheduleDataOptions = {
  enableRealtime?: boolean;
  pollIntervalMs?: number;
};

export const useScheduleData = (route: string = 'MATIA', options?: UseScheduleDataOptions) => {
  const [morningFirst, setMorningFirst] = useState<ScheduleSection | null>(null);
  const [morningSecond, setMorningSecond] = useState<ScheduleSection | null>(null);
  const [morningThird, setMorningThird] = useState<ScheduleSection | null>(null);
  const [afternoonFirst, setAfternoonFirst] = useState<ScheduleSection | null>(null);
  const [afternoonSecond, setAfternoonSecond] = useState<ScheduleSection | null>(null);
  const [afternoonThird, setAfternoonThird] = useState<ScheduleSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestIdRef = useRef(0);
  const refetchTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const pendingRefetchRef = useRef(false);
  const hasDataRef = useRef(false);
  const mountedRef = useRef(true);

  const enableRealtime = options?.enableRealtime ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? 30_000;

  const fetchSchedules = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      const showLoading = opts?.showLoading ?? false;
      const requestId = ++requestIdRef.current;

      // No actualizar estado si el componente se ha desmontado
      if (!mountedRef.current) return;

      if (showLoading) setLoading(true);
      if (showLoading || !hasDataRef.current) setError(null);

      // Evita tormentas de peticiones cuando llegan muchos eventos de realtime
      if (inFlightRef.current && !showLoading) {
        pendingRefetchRef.current = true;
        return;
      }

      inFlightRef.current = true;

      try {
        const result = await withTimeout(
          supabase
            .from('schedule_trips')
            .select('*, passengers_public(*)')
            .eq('is_active', true)
            .eq('route', route)
            .order('scheduled_time')
            .order('sort_order'),
          FETCH_TIMEOUT_MS
        );

        // If a newer request has started or component unmounted, ignore this result
        if (requestId !== requestIdRef.current || !mountedRef.current) return;

        const { data, error: fetchError } = result as any;

        if (fetchError) {
          console.error('Error fetching schedules:', fetchError);
          // Solo mostrar error si no tenemos datos previos y es carga inicial
          if (showLoading && !hasDataRef.current) {
            setError('Error al cargar horarios');
          }
          if (showLoading) setLoading(false);
          return;
        }

        const trips = (data || []) as ScheduleTrip[];

        // Detectar secciones dinámicamente según los datos
        const sections = [...new Set(trips.filter(t => t.is_active).map(t => t.schedule_section))];
        
        // Función para extraer el número de orden de la sección (ej: "AFTERNOON_1" -> 1, "afternoon_first" -> 1)
        const getSectionOrder = (section: string): number => {
          // Primero buscar número al final (ej: EGURTZEGI_AFTERNOON_1, ASPACE_MORNING_2)
          const numMatch = section.match(/_(\d+)$/);
          if (numMatch) return parseInt(numMatch[1], 10);
          
          // Luego buscar palabras ordinales (first, second, third)
          const lower = section.toLowerCase();
          if (lower.includes('first') || lower.includes('_1')) return 1;
          if (lower.includes('second') || lower.includes('_2')) return 2;
          if (lower.includes('third') || lower.includes('_3')) return 3;
          
          return 0;
        };
        
        // Helper para obtener la primera hora de una sección (para ordenar cronológicamente)
        const getSectionFirstTime = (section: string): number => {
          const times = trips
            .filter(t => t.is_active && t.schedule_section === section)
            .map(t => timeToMinutes(t.scheduled_time));
          return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
        };

        // Para las mañanas también ordenamos por la primera hora de cada tanda
        const morningSections = sections
          .filter(s => s.toLowerCase().includes('morning'))
          .sort((a, b) => {
            const timeA = getSectionFirstTime(a);
            const timeB = getSectionFirstTime(b);
            if (timeA !== timeB) return timeA - timeB;
            return getSectionOrder(a) - getSectionOrder(b);
          });

        // Para la tarde ordenamos igualmente por la primera hora de cada tanda
        const afternoonSections = sections
          .filter(s => s.toLowerCase().includes('afternoon'))
          .sort((a, b) => {
            const timeA = getSectionFirstTime(a);
            const timeB = getSectionFirstTime(b);
            if (timeA !== timeB) return timeA - timeB;
            return getSectionOrder(a) - getSectionOrder(b);
          });

        // Títulos por posición para mañanas (ordenadas cronológicamente)
        const morningPositionTitles: Record<1 | 2 | 3, { titleEu: string; titleEs: string }> = {
          1: SECTION_TITLES['morning_first'] ?? { titleEu: 'Goizeko lehenengo bidaia', titleEs: 'Primer viaje mañanas' },
          2: SECTION_TITLES['morning_second'] ?? { titleEu: 'Goizeko bigarren bidaia', titleEs: 'Segundo viaje mañanas' },
          3: { titleEu: 'Goizeko hirugarren bidaia', titleEs: 'Tercer viaje mañanas' },
        };

        const applyMorningTitle = (section: ScheduleSection | null, position: 1 | 2 | 3): ScheduleSection | null => {
          if (!section) return null;
          return { ...section, ...morningPositionTitles[position] };
        };

        // Batch state updates para evitar renders intermedios
        const newMorningFirstRaw = morningSections[0] ? transformTripsToSection(trips, morningSections[0]) : null;
        const newMorningSecondRaw = morningSections[1] ? transformTripsToSection(trips, morningSections[1]) : null;
        const newMorningThirdRaw = morningSections[2] ? transformTripsToSection(trips, morningSections[2]) : null;

        const newMorningFirst = applyMorningTitle(newMorningFirstRaw, 1);
        const newMorningSecond = applyMorningTitle(newMorningSecondRaw, 2);
        const newMorningThird = applyMorningTitle(newMorningThirdRaw, 3);

        // Para la tarde, la "1ª/2ª/3ª tanda" debe corresponder al ORDEN mostrado (por hora),
        // no necesariamente al nombre del schedule_section en base de datos.
        const afternoonPositionTitles: Record<1 | 2 | 3, { titleEu: string; titleEs: string }> = {
          1: SECTION_TITLES['afternoon_first'] ?? { titleEu: 'Arratsaldeko lehenengo bidaia', titleEs: 'Primer viaje tardes' },
          2: SECTION_TITLES['afternoon_second'] ?? { titleEu: 'Arratsaldeko bigarren bidaia', titleEs: 'Segundo viaje tardes' },
          3: { titleEu: 'Arratsaldeko hirugarren bidaia', titleEs: 'Tercer viaje tardes' },
        };

        const applyAfternoonTitle = (section: ScheduleSection | null, position: 1 | 2 | 3): ScheduleSection | null => {
          if (!section) return null;
          return { ...section, ...afternoonPositionTitles[position] };
        };

        const newAfternoonFirstRaw = afternoonSections[0] ? transformTripsToSection(trips, afternoonSections[0]) : null;
        const newAfternoonSecondRaw = afternoonSections[1] ? transformTripsToSection(trips, afternoonSections[1]) : null;
        const newAfternoonThirdRaw = afternoonSections[2] ? transformTripsToSection(trips, afternoonSections[2]) : null;

        const newAfternoonFirst = applyAfternoonTitle(newAfternoonFirstRaw, 1);
        const newAfternoonSecond = applyAfternoonTitle(newAfternoonSecondRaw, 2);
        const newAfternoonThird = applyAfternoonTitle(newAfternoonThirdRaw, 3);
        
        // Verificar que el componente sigue montado antes de actualizar
        if (!mountedRef.current) return;
        
        setMorningFirst(newMorningFirst);
        setMorningSecond(newMorningSecond);
        setMorningThird(newMorningThird);
        setAfternoonFirst(newAfternoonFirst);
        setAfternoonSecond(newAfternoonSecond);
        setAfternoonThird(newAfternoonThird);
        setLastUpdated(new Date());
        setError(null); // Limpiar cualquier error previo al tener datos exitosos
        hasDataRef.current = true;
        if (showLoading) setLoading(false);
      } catch (e) {
        if (requestId !== requestIdRef.current || !mountedRef.current) return;

        console.error('Error fetching schedules:', e);
        const isTimeout = e instanceof Error && e.message === 'timeout';
        // Solo mostrar error si es carga inicial Y no tenemos datos previos
        if (showLoading && !hasDataRef.current) {
          setError(isTimeout ? 'Sin conexión o tiempo de espera agotado' : 'Error al cargar horarios');
        }
        if (showLoading) setLoading(false);
      } finally {
        inFlightRef.current = false;
        if (pendingRefetchRef.current && mountedRef.current) {
          pendingRefetchRef.current = false;
          // refetch en segundo plano (sin bloquear pantalla)
          fetchSchedules();
        }
      }
    },
    [route]
  );

  useEffect(() => {
    // Marcar como montado
    mountedRef.current = true;

    // Primera carga: bloqueante (spinner).
    fetchSchedules({ showLoading: true });

    // En modo app/PWA algunas veces los websockets se bloquean (iOS/Android).
    // Para garantizar estabilidad podemos desactivar realtime y usar polling.
    if (!enableRealtime) {
      if (typeof window === 'undefined') {
        return () => {
          mountedRef.current = false;
        };
      }

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchSchedules();
        }
      };

      const onOnline = () => {
        fetchSchedules();
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('online', onOnline);

      const intervalId = window.setInterval(() => {
        // En background no hace falta
        if (document.visibilityState !== 'visible') return;
        // Si no hay red, no forzar (deja el último dato mostrado)
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        fetchSchedules();
      }, pollIntervalMs);

      return () => {
        mountedRef.current = false;
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('online', onOnline);
        window.clearInterval(intervalId);
        if (refetchTimerRef.current) {
          clearTimeout(refetchTimerRef.current);
          refetchTimerRef.current = null;
        }
      };
    }

    // En modo offline, evitamos abrir websockets (pueden bloquear/reintentar indefinidamente en algunas PWAs)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return () => {
        mountedRef.current = false;
      };
    }

    const scheduleBackgroundRefetch = () => {
      if (typeof window === 'undefined' || !mountedRef.current) return;
      if (refetchTimerRef.current) return;

      refetchTimerRef.current = window.setTimeout(() => {
        refetchTimerRef.current = null;
        if (mountedRef.current) {
          fetchSchedules(); // en segundo plano
        }
      }, 400);
    };

    // Subscribe to realtime changes (filtrado por ruta para reducir carga)
    const channel = supabase
      .channel(`schedule_changes:${route}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_trips',
          filter: `route=eq.${route}`,
        },
        scheduleBackgroundRefetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passengers',
          filter: `route=eq.${route}`,
        },
        scheduleBackgroundRefetch
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [fetchSchedules, route, enableRealtime, pollIntervalMs]);

  return {
    morningFirst,
    morningSecond,
    morningThird,
    afternoonFirst,
    afternoonSecond,
    afternoonThird,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchSchedules({ showLoading: true }),
  };
};

