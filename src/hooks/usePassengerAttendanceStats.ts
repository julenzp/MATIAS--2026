import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PassengerStats = {
  passengerId: string;
  passengerName: string;
  route: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number; // 0-100
  absencesLast30Days: number;
};

// Key for stats: "passengerName|route" to ensure uniqueness per route
const makeStatsKey = (name: string, route: string) => `${name}|${route}`;

export const usePassengerAttendanceStats = (routeCode: string) => {
  const [stats, setStats] = useState<Record<string, PassengerStats>>({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(0);

  const fetchStats = useCallback(async () => {
    // Skip fetching if route is a sentinel value (panel not open)
    if (routeCode === '__SKIP__') {
      setLoading(false);
      return;
    }

    // Throttle to avoid excessive requests
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;

    try {
      // First, get the list of passengers for this route (or all if no route specified)
      let passengersQuery = supabase
        .from('passengers_public')
        .select('id, name, route')
        .eq('is_active', true);

      if (routeCode) {
        passengersQuery = passengersQuery.eq('route', routeCode);
      }

      const { data: passengers, error: passengersError } = await passengersQuery;

      if (passengersError) {
        console.error('Error fetching passengers:', passengersError);
        return;
      }

      if (!passengers || passengers.length === 0) {
        setStats({});
        setLoading(false);
        return;
      }

      // Get date 30 days ago - ONLY count records from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      // Create a map of passenger names grouped by route for accurate querying
      const passengersByRoute: Record<string, string[]> = {};
      passengers.forEach(p => {
        if (!passengersByRoute[p.route]) {
          passengersByRoute[p.route] = [];
        }
        passengersByRoute[p.route].push(p.name);
      });

      // Fetch attendance records for ALL passengers, filtered by both name AND route
      // This ensures accurate stats even for passengers with identical names in different routes
      const recordsPromises = Object.entries(passengersByRoute).map(async ([route, names]) => {
      const { data, error } = await supabase
          .from('attendance_records')
          .select('user_name, status, record_date, route, actual_time')
          .eq('route', route)
          .in('user_name', names)
          .gte('record_date', thirtyDaysAgoStr)
          .in('status', ['present', 'absent']);

        if (error) {
          console.error(`Error fetching attendance for route ${route}:`, error);
          return [];
        }
        return data || [];
      });

      const allRecordsArrays = await Promise.all(recordsPromises);
      const allRecords = allRecordsArrays.flat();

      if (!mountedRef.current) return;

      // Process stats with new key that includes route
      const userStats: Record<string, PassengerStats> = {};

      // Initialize all passengers with 0 stats (using composite key)
      passengers.forEach((p) => {
        const key = makeStatsKey(p.name, p.route);
        userStats[key] = {
          passengerId: p.id,
          passengerName: p.name,
          route: p.route,
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          attendanceRate: 0,
          absencesLast30Days: 0,
        };
      });

      // Structural markers to exclude from real stats
      const EXCLUDED_NAMES = new Set(['ZENTRO', 'zentro', 'Llegada al centro', 'Salida del centro']);

      // Process attendance records
      allRecords.forEach((record) => {
        // Skip structural markers
        if (EXCLUDED_NAMES.has(record.user_name)) return;

        const route = record.route || '';
        const key = makeStatsKey(record.user_name, route);
        
        if (!userStats[key]) {
          return;
        }

        userStats[key].totalRecords++;

        if (record.status === 'present') {
          userStats[key].presentCount++;
          // Check if late (T+ marker in actual_time)
          if (record.actual_time && record.actual_time.includes('T+')) {
            userStats[key].lateCount++;
          }
        } else if (record.status === 'absent') {
          userStats[key].absentCount++;
          userStats[key].absencesLast30Days++;
        }
      });

      // Calculate attendance rate for each user
      Object.values(userStats).forEach((stat) => {
        if (stat.totalRecords === 0) {
          stat.attendanceRate = 0;
        } else if (stat.presentCount === 0) {
          stat.attendanceRate = 0;
        } else {
          stat.attendanceRate = Math.round((stat.presentCount / stat.totalRecords) * 100);
        }
      });

      setStats(userStats);
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [routeCode]);

  // Reset throttle when routeCode changes so stats load immediately
  useEffect(() => {
    lastFetchRef.current = 0;
  }, [routeCode]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchStats();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  // Updated to accept both name and route for precise lookup
  const getStatsForPassenger = useCallback((passengerName: string, passengerRoute?: string): PassengerStats | undefined => {
    // If route is provided, use composite key for exact match
    if (passengerRoute) {
      const key = makeStatsKey(passengerName, passengerRoute);
      return stats[key];
    }
    
    // Fallback: search by name only (first match) - less precise but backwards compatible
    const entries = Object.entries(stats);
    for (const [key, stat] of entries) {
      if (stat.passengerName === passengerName) {
        return stat;
      }
    }
    return undefined;
  }, [stats]);

  return { stats, loading, getStatsForPassenger, refetch: fetchStats };
};
