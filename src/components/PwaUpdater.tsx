import { useEffect, useRef } from "react";

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes instead of 1
const RELOAD_GUARD_KEY = "erbi:pwa_reload_once";
const RELOAD_GUARD_TTL_MS = 60 * 1000; // 60s guard to prevent reload loops
const APP_BUILD_ID = __APP_BUILD_ID__;

function getFreshBuildUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("v", APP_BUILD_ID);
  return url.toString();
}

/**
 * PWA auto-updater: force-check updates on boot/focus/online,
 * activate waiting SW immediately and reload once when control changes.
 */
export function PwaUpdater() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const handlersAttachedRef = useRef(false);
  const controllerListenerAttachedRef = useRef(false);
  const watchedInstallingWorkersRef = useRef(new WeakSet<ServiceWorker>());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const safeReloadOnce = () => {
      try {
        const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
        if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < RELOAD_GUARD_TTL_MS) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, Date.now().toString());
      } catch {
        // Ignore storage errors and continue with reload
      }
      window.location.replace(getFreshBuildUrl());
    };

    const activateWaiting = (worker: ServiceWorker | null | undefined) => {
      if (!worker) return;
      try {
        worker.postMessage({ type: "SKIP_WAITING" });
      } catch (error) {
        console.warn("[PWA] Failed to activate waiting SW", error);
      }
    };

    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (watchedInstallingWorkersRef.current.has(worker)) return;
      watchedInstallingWorkersRef.current.add(worker);

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          activateWaiting(registrationRef.current?.waiting ?? worker);
        }
      });
    };

    const attachUpdateHandlersOnce = (registration: ServiceWorkerRegistration) => {
      if (handlersAttachedRef.current) return;
      handlersAttachedRef.current = true;

      watchInstallingWorker(registration.installing);
      activateWaiting(registration.waiting);

      registration.addEventListener("updatefound", () => {
        watchInstallingWorker(registration.installing);
      });
    };

    const attachControllerChangeListenerOnce = () => {
      if (controllerListenerAttachedRef.current) return;
      controllerListenerAttachedRef.current = true;

      navigator.serviceWorker.addEventListener("controllerchange", safeReloadOnce);
    };

    const checkForUpdates = async () => {
      try {
        const registration =
          registrationRef.current ??
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.ready);

        if (!registration) return;

        registrationRef.current = registration;
        attachUpdateHandlersOnce(registration);
        attachControllerChangeListenerOnce();

        await registration.update();
        activateWaiting(registration.waiting);
      } catch (error) {
        console.warn("[PWA] SW update check failed", error);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    const handlePageshow = () => void checkForUpdates();
    const handleOnline = () => void checkForUpdates();

    void checkForUpdates();
    const interval = window.setInterval(() => void checkForUpdates(), UPDATE_INTERVAL_MS);
    window.addEventListener("pageshow", handlePageshow);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pageshow", handlePageshow);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
