import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const UNREAD_ALERT_MINUTES = 60;

interface Notification {
  id: string;
  route: string;
  message: string;
  priority: string;
  created_at: string;
}

// Request browser notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

// Send browser notification
const sendBrowserNotification = (title: string, body: string, tag: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      tag,
      requireInteraction: true,
    });
  }
};

export const useUnreadAlerts = () => {
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState<Set<string>>(new Set());
  const notifiedAlertsRef = useRef<Set<string>>(new Set());
  const permissionRequestedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCheckRef = useRef(0);

  // Throttle to prevent excessive calls (min 5 seconds between checks)
  const THROTTLE_MS = 5000;

  const checkUnreadAlerts = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < THROTTLE_MS) {
      return;
    }
    lastCheckRef.current = now;

    if (!isMountedRef.current) return;

    try {
      const { data: notifications, error: notifError } = await supabase
        .from("route_notifications")
        .select("id, route, message, priority, created_at")
        .eq("is_active", true);

      if (!isMountedRef.current) return;

      if (notifError || !notifications) {
        setUnreadAlertCount(0);
        setUnreadAlerts(new Set());
        return;
      }

      const { data: reads, error: readsError } = await supabase
        .from("notification_reads")
        .select("notification_id");

      if (!isMountedRef.current) return;

      if (readsError) {
        console.error("Error fetching reads:", readsError);
        return;
      }

      const readIds = new Set(reads?.map((r) => r.notification_id) || []);
      const currentTime = new Date();
      const alertIds = new Set<string>();
      const newAlerts: Notification[] = [];

      notifications.forEach((notification) => {
        const createdAt = new Date(notification.created_at);
        const minutesSinceCreation =
          (currentTime.getTime() - createdAt.getTime()) / (1000 * 60);
        const hasBeenRead = readIds.has(notification.id);

        if (minutesSinceCreation >= UNREAD_ALERT_MINUTES && !hasBeenRead) {
          alertIds.add(notification.id);

          if (!notifiedAlertsRef.current.has(notification.id)) {
            newAlerts.push(notification);
            notifiedAlertsRef.current.add(notification.id);
          }
        }
      });

      if (!isMountedRef.current) return;

      setUnreadAlerts(alertIds);
      setUnreadAlertCount(alertIds.size);

      if (newAlerts.length > 0) {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission && isMountedRef.current) {
          newAlerts.forEach((notification) => {
            const minutes = Math.floor(
              (currentTime.getTime() - new Date(notification.created_at).getTime()) /
                (1000 * 60)
            );
            sendBrowserNotification(
              `⚠️ Aviso sin leer - ${notification.route}`,
              `"${notification.message.substring(0, 100)}..." lleva ${minutes} minutos sin confirmar`,
              `unread-alert-${notification.id}`
            );
          });
        }
      }

      // Limpiar referencias a notificaciones eliminadas
      const activeNotificationIds = new Set(notifications.map(n => n.id));
      notifiedAlertsRef.current.forEach((id) => {
        if (!activeNotificationIds.has(id)) {
          notifiedAlertsRef.current.delete(id);
        }
      });
    } catch (error) {
      console.error("Error checking unread alerts:", error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      await requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial check
    checkUnreadAlerts();

    // Check every minute
    const interval = setInterval(checkUnreadAlerts, 60000);

    // Subscribe to realtime changes
    const notificationsChannel = supabase
      .channel("global-unread-alerts-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "route_notifications",
        },
        () => {
          checkUnreadAlerts();
        }
      )
      .subscribe();

    const readsChannel = supabase
      .channel("global-unread-alerts-reads")
      .on(
        "postgres_changes",
        {
          event: "*",  // Escuchar INSERT y DELETE
          schema: "public",
          table: "notification_reads",
        },
        () => {
          checkUnreadAlerts();
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(readsChannel);
    };
  }, []); // Empty deps - checkUnreadAlerts is stable due to useCallback with empty deps

  return {
    unreadAlertCount,
    unreadAlerts,
    checkUnreadAlerts,
    requestPermission,
  };
};
