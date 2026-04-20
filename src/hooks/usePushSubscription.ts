import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription(
  token: string | undefined,
  routeName: string = "ASPACE"
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(true);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const functionUrl = `https://${projectId}.supabase.co/functions/v1/send-push`;

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
    checkAndAutoReRegister();
  }, [token]);

  const checkAndAutoReRegister = async () => {
    try {
      if (!("serviceWorker" in navigator) || !token) {
        setIsLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager?.getSubscription();

      if (sub) {
        // Browser has an active subscription — check if it exists in the DB
        const subJson = sub.toJSON();
        try {
          const resp = await fetch(functionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: apiKey },
            body: JSON.stringify({
              action: "check_subscription",
              token,
              endpoint: subJson.endpoint,
            }),
          });
          const result = await resp.json();

          if (!result.exists) {
            // Browser has subscription but DB doesn't — auto re-register
            console.log("🔄 Auto re-registering push subscription in DB");
            await fetch(functionUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: apiKey },
              body: JSON.stringify({
                action: "subscribe",
                token,
                route_name: routeName,
                subscription: {
                  endpoint: subJson.endpoint,
                  keys: subJson.keys,
                },
              }),
            });
          }
        } catch {
          // Network error — silently ignore, will retry next time
        }
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  const subscribe = useCallback(async () => {
    if (!token || !isSupported) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // Get VAPID public key from edge function
      const resp = await fetch(functionUrl, {
        method: "GET",
        headers: { apikey: apiKey },
      });

      if (!resp.ok) throw new Error("Failed to get VAPID key");

      const { publicKey } = await resp.json();
      if (!publicKey) throw new Error("No VAPID key returned");

      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to backend
      const subJson = sub.toJSON();
      await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          action: "subscribe",
          token,
          route_name: routeName,
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [token, isSupported, routeName, functionUrl, apiKey]);

  return { isSubscribed, isSupported, permission, isLoading, subscribe };
}
