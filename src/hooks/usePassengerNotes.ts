import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PassengerNote = {
  id: string;
  passenger_id: string;
  message: string;
  created_at: string;
};

// Normalize route code for channel name (remove special chars)
const normalizeRouteCode = (routeCode: string): string => {
  return routeCode
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
};

export const usePassengerNotes = (routeCode: string) => {
  const [notes, setNotes] = useState<PassengerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(0);

  const fetchNotes = useCallback(async (force = false) => {
    // Skip if route is empty to avoid useless queries (route=eq.)
    if (!routeCode) {
      setNotes([]);
      setLoading(false);
      return;
    }

    // Throttle fetches to avoid hammering the server (min 2s between calls)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;

    if (!mountedRef.current) return;
    
    try {
      // First get all passenger IDs that are in schedule_trips for this route
      const { data: routePassengers } = await supabase
        .from('schedule_trips')
        .select('passenger_id')
        .eq('route', routeCode)
        .eq('is_active', true);
      
      const routePassengerIds = (routePassengers || [])
        .map(rp => rp.passenger_id)
        .filter((id): id is string => Boolean(id));

      if (!mountedRef.current) return;

      if (routePassengerIds.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      // Get all active notes for those passengers
      const { data: notesData, error } = await supabase
        .from('passenger_notes')
        .select('id, passenger_id, message, created_at')
        .in('passenger_id', routePassengerIds)
        .eq('is_active', true);
      
      if (!mountedRef.current) return;

      if (error) {
        console.error('Error fetching passenger notes:', error);
        setNotes([]);
      } else {
        setNotes(notesData || []);
      }
    } catch (err) {
      console.error('Error in fetchNotes:', err);
      if (mountedRef.current) {
        setNotes([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [routeCode]);

  useEffect(() => {
    mountedRef.current = true;
    lastFetchRef.current = 0; // Reset throttle on route change

    // Initial fetch
    setLoading(true);
    fetchNotes(true);

    // Subscribe to changes on passenger_notes table
    const normalizedRoute = normalizeRouteCode(routeCode);
    const channelName = `notes_${normalizedRoute}_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passenger_notes',
        },
        (payload) => {
          console.log('📝 Passenger note change:', payload.eventType);
          // Force immediate refresh on any change
          fetchNotes(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_trips',
          filter: `route=eq.${routeCode}`,
        },
        () => {
          fetchNotes(true);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Notes channel (${normalizedRoute}):`, status);
      });

    // Polling fallback: refresh when app becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotes(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also refresh when coming back online
    const handleOnline = () => {
      fetchNotes(true);
    };
    window.addEventListener('online', handleOnline);

    // Periodic polling as ultimate fallback (every 30 seconds)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotes();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      clearInterval(pollInterval);
    };
  }, [routeCode, fetchNotes]);

  const getNoteForPassenger = useCallback((passengerId: string): PassengerNote | undefined => {
    return notes.find(n => n.passenger_id === passengerId);
  }, [notes]);

  const refetch = useCallback(() => fetchNotes(true), [fetchNotes]);

  return { notes, loading, getNoteForPassenger, refetch };
};
