import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface NotificationBellProps {
  routeCode: string;
  onClick?: () => void;
  enableRealtime?: boolean;
  pollIntervalMs?: number;
}

// Get device ID for tracking read status
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("erbi_device_id");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("erbi_device_id", deviceId);
  }
  return deviceId;
};

export const NotificationBell = ({
  routeCode,
  onClick,
  enableRealtime = true,
  pollIntervalMs = 30_000,
}: NotificationBellProps) => {
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const previousUnreadRef = useRef(-1);
  const { playSound } = useNotificationSound();

  const lastFetchRef = useRef(0);

  const fetchNotificationStatus = useCallback(async (force = false) => {
    // Throttle: max once every 5 seconds
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 5000) return;
    lastFetchRef.current = now;

    try {
      const deviceId = getDeviceId();

      // Get all active notifications for this route
      const { data: notifications, error: notifError } = await supabase
        .from("route_notifications")
        .select("id")
        .eq("route", routeCode)
        .eq("is_active", true);

      if (notifError || !notifications) {
        setTotalCount(0);
        setUnreadCount(0);
        setHasUnread(false);
        return;
      }

      const total = notifications.length;
      setTotalCount(total);

      if (total === 0) {
        setUnreadCount(0);
        setHasUnread(false);
        previousUnreadRef.current = 0;
        return;
      }

      // Get read notifications for this device
      const { data: readNotifications } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("route", routeCode)
        .eq("device_id", deviceId);

      const readIds = new Set(readNotifications?.map((r) => r.notification_id) || []);
      const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
      const newUnreadCount = unreadNotifications.length;

      // Play sound if there are new unread notifications (not on first load)
      if (previousUnreadRef.current >= 0 && newUnreadCount > previousUnreadRef.current) {
        playSound();
      }

      previousUnreadRef.current = newUnreadCount;
      setUnreadCount(newUnreadCount);
      setHasUnread(newUnreadCount > 0);
    } catch (err) {
      console.warn("NotificationBell fetch error:", err);
    }
  }, [routeCode, playSound]);

  useEffect(() => {
    fetchNotificationStatus(true);

    const shouldUseRealtime =
      enableRealtime && (typeof navigator === "undefined" || navigator.onLine);

    if (typeof window === "undefined") return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotificationStatus();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!shouldUseRealtime) {
      const intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        fetchNotificationStatus();
      }, pollIntervalMs);

      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.clearInterval(intervalId);
      };
    }

    // Single channel for both tables - debounced
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchNotificationStatus(), 1000);
    };

    const channel = supabase
      .channel("notif-bell-" + routeCode)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_notifications" },
        (payload) => {
          if (payload.eventType === 'DELETE' || 
              (payload.new && (payload.new as any).route === routeCode) ||
              (payload.old && (payload.old as any).route === routeCode)) {
            debouncedFetch();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_reads" },
        (payload) => {
          if (payload.eventType === 'DELETE' || 
              (payload.new && (payload.new as any).route === routeCode) ||
              (payload.old && (payload.old as any).route === routeCode)) {
            debouncedFetch();
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [routeCode, fetchNotificationStatus, enableRealtime, pollIntervalMs]);

  const scrollToNotifications = () => {
    // Scroll to top where notifications are displayed
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onClick?.();
  };

  return (
    <button
      onClick={scrollToNotifications}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-300",
        "w-12 h-12 sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:rounded-lg",
        "border border-border",
        // Rojo cuando hay sin leer, normal cuando está todo leído o no hay avisos
        hasUnread
          ? "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90"
          : totalCount > 0
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "bg-muted text-foreground hover:bg-muted/80"
      )}
      title={
        hasUnread
          ? `${unreadCount} aviso(s) sin leer`
          : totalCount > 0
            ? `${totalCount} aviso(s) - todos leídos`
            : "Sin avisos"
      }
    >
      {hasUnread ? (
        <BellRing size={22} className="animate-shake" />
      ) : (
        <Bell size={22} />
      )}

      {/* Badge */}
      <span
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center",
          "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
          "sm:relative sm:top-auto sm:right-auto sm:ml-1.5 sm:min-w-[20px] sm:h-5 sm:text-xs",
          hasUnread
            ? "bg-accent text-accent-foreground"
            : totalCount > 0
              ? "bg-card text-foreground border border-border"
              : "bg-card text-muted-foreground border border-border"
        )}
      >
        {hasUnread ? unreadCount : totalCount > 0 ? "✓" : "·"}
      </span>
    </button>
  );
};
