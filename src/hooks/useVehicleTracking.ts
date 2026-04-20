import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that sends bus GPS pings every 60 seconds while the route is active.
 * Only activates for ASPACE route when `enabled` is true.
 */
export function useVehicleTracking(routeName: string, enabled: boolean) {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || routeName !== "ASPACE" || !navigator.geolocation) return;

    const sendPing = async () => {
      const pos = lastPosRef.current;
      if (!pos) return;

      await supabase.from("vehicle_location").insert({
        route_name: routeName,
        lat: pos.lat,
        lng: pos.lng,
        source_device: navigator.userAgent.substring(0, 80),
      });
    };

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastPosRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    // Send ping every 60 seconds
    sendPing(); // First ping immediately
    intervalRef.current = setInterval(sendPing, 60000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [routeName, enabled]);
}
