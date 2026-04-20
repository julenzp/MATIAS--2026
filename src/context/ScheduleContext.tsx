import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserStatus = "pending" | "present" | "absent";

export type UserSelection = {
  status: UserStatus;
  actualTime?: string;
};

type ScheduleContextType = {
  selections: Record<string, UserSelection>;
  presentTimestamps: Record<string, number>;
  selectUser: (tripId: string, userName: string, scheduledTime: string, route?: string, customActualTime?: string) => void;
  markAbsent: (tripId: string, userName: string, scheduledTime: string, route?: string) => void;
  resetUser: (tripId: string) => void;
  getSelection: (tripId: string) => UserSelection;
  getPresentTimestamp: (tripId: string) => number | undefined;
  isLoading: boolean;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const FETCH_TIMEOUT_MS = 12_000;
const LOAD_THROTTLE_MS = 3000;

const withTimeout = async <T,>(promiseLike: PromiseLike<T>, ms: number): Promise<T> => {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
};

const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
};

export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [selections, setSelections] = useState<Record<string, UserSelection>>({});
  const [presentTimestamps, setPresentTimestamps] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<string>("MATIA");
  const { toast } = useToast();
  
  const isMountedRef = useRef(true);
  const lastLoadRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const loadTodayRecords = useCallback(async (force = false) => {
    // Throttle calls
    const now = Date.now();
    if (!force && now - lastLoadRef.current < LOAD_THROTTLE_MS) {
      return;
    }
    lastLoadRef.current = now;

    if (!isMountedRef.current) return;

    try {
      const result = await withTimeout(
        supabase
          .from('attendance_records')
          .select('*')
          .eq('record_date', getTodayDate()),
        FETCH_TIMEOUT_MS
      );

      if (!isMountedRef.current) return;

      const { data, error } = result as any;

      if (error) {
        console.error('Error loading records:', error);
        return;
      }

      if (data) {
        const loadedSelections: Record<string, UserSelection> = {};
        data.forEach((record: any) => {
          if (record.status !== 'pending') {
            loadedSelections[record.trip_id] = {
              status: record.status as UserStatus,
              actualTime: record.actual_time || undefined
            };
          }
        });
        if (isMountedRef.current) {
          setSelections(loadedSelections);
        }
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load today's records on mount and subscribe to realtime changes
  useEffect(() => {
    isMountedRef.current = true;
    let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    loadTodayRecords(true);

    // En modo offline, evitamos abrir websockets
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsLoading(false);
      const handleOnline = () => loadTodayRecords(true);
      window.addEventListener('online', handleOnline);

      const handleVisibility = () => {
        if (document.visibilityState === 'visible') loadTodayRecords();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        isMountedRef.current = false;
        window.removeEventListener('online', handleOnline);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    // Debounced handler: coalesce rapid realtime events into a single state update
    const handleRealtimeEvent = (payload: any) => {
      if (!isMountedRef.current) return;
      const today = getTodayDate();
      const record = payload.new as any;
      const eventType = payload.eventType;

      // For INSERT/UPDATE, apply optimistic update immediately
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && record?.record_date === today && record.status !== 'pending') {
        setSelections((prev) => ({
          ...prev,
          [record.trip_id]: {
            status: record.status as UserStatus,
            actualTime: record.actual_time || undefined,
          },
        }));
        return; // No need for full refetch
      }

      // For DELETE, remove locally and debounce a full refetch
      if (eventType === 'DELETE') {
        const old = payload.old as any;
        if (old?.trip_id) {
          setSelections((prev) => {
            const next = { ...prev };
            delete next[old.trip_id];
            return next;
          });
        }
        // Debounce full reload for DELETEs (they may come in batches)
        if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
        realtimeDebounceTimer = setTimeout(() => {
          if (isMountedRef.current) loadTodayRecords();
        }, 1000);
      }
    };

    // Single channel with all events
    const channel = supabase
      .channel('attendance-realtime')
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
        },
        handleRealtimeEvent
      )
      .subscribe();

    channelRef.current = channel;

    const handleOnline = () => loadTodayRecords(true);
    window.addEventListener('online', handleOnline);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadTodayRecords();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMountedRef.current = false;
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadTodayRecords]);

  const saveRecord = async (
    tripId: string,
    userName: string,
    scheduledTime: string,
    status: UserStatus,
    actualTime: string,
    route?: string
  ) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          trip_id: tripId,
          user_name: userName,
          scheduled_time: scheduledTime,
          actual_time: actualTime,
          status: status,
          record_date: getTodayDate(),
          route: route || currentRoute
        }, {
          onConflict: 'trip_id,record_date'
        });

      if (error) {
        console.error('Error saving record:', error);
        toast({
          title: "Errorea",
          description: "Ezin izan da erregistroa gorde",
          variant: "destructive"
        });
      } else {
        toast({
          title: status === 'present' ? "✓ Bertaratua" : "✗ Ez dator",
          description: `${userName} - ${actualTime}`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const deleteRecord = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('trip_id', tripId)
        .eq('record_date', getTodayDate());

      if (error) {
        console.error('Error deleting record:', error);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const selectUser = (tripId: string, userName: string, scheduledTime: string, route?: string, customActualTime?: string) => {
    const actualTime = customActualTime || getCurrentTime();
    setSelections(prev => ({
      ...prev,
      [tripId]: {
        status: "present",
        actualTime
      }
    }));
    // Track exact timestamp for late calculation (only on initial present, not on T update)
    if (!customActualTime) {
      setPresentTimestamps(prev => ({ ...prev, [tripId]: Date.now() }));
    }
    saveRecord(tripId, userName, scheduledTime, 'present', actualTime, route);
  };

  const markAbsent = (tripId: string, userName: string, scheduledTime: string, route?: string) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // If previously present, calculate waiting time at stop
    const presentTs = presentTimestamps[tripId];
    let actualTime = currentTime;
    if (presentTs) {
      const elapsedMs = Date.now() - presentTs;
      const waitMin = Math.max(1, Math.round(elapsedMs / 60000));
      actualTime = `${currentTime} (E+${waitMin}min)`;
    }
    
    setSelections(prev => ({
      ...prev,
      [tripId]: {
        status: "absent",
        actualTime
      }
    }));
    // Clean up the present timestamp
    setPresentTimestamps(prev => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
    saveRecord(tripId, userName, scheduledTime, 'absent', actualTime, route);
  };

  const resetUser = (tripId: string) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      delete newSelections[tripId];
      return newSelections;
    });
    setPresentTimestamps(prev => {
      const newTs = { ...prev };
      delete newTs[tripId];
      return newTs;
    });
    deleteRecord(tripId);
  };

  const getSelection = (tripId: string): UserSelection => {
    return selections[tripId] || { status: "pending" };
  };

  const getPresentTimestamp = (tripId: string): number | undefined => {
    return presentTimestamps[tripId];
  };

  return (
    <ScheduleContext.Provider value={{ 
      selections, 
      presentTimestamps,
      selectUser, 
      markAbsent, 
      resetUser, 
      getSelection, 
      getPresentTimestamp,
      isLoading,
      currentRoute,
      setCurrentRoute
    }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);

  // En producción, en casos raros (caché PWA/build mezclado) el árbol puede intentar
  // renderizar antes de que el Provider correcto esté activo. No debemos tumbar la app.
  if (!context) {
    if (import.meta.env.DEV) {
      console.warn("useSchedule used without ScheduleProvider; returning safe defaults");
    }

    return {
      selections: {},
      presentTimestamps: {},
      selectUser: () => {},
      markAbsent: () => {},
      resetUser: () => {},
      getSelection: () => ({ status: "pending" }),
      getPresentTimestamp: () => undefined,
      isLoading: false,
      currentRoute: "MATIA",
      setCurrentRoute: () => {},
    };
  }

  return context;
};

