import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./matia-pink.css";
import "./matia-inject.ts";

// MATIA BUILD 2026-04-22 10:46 - FORCE REBUILD WITH PINK COLORS
console.log("🎀 MATIA App v0.0.1 loaded - Pink colors enabled 2026-04-22");

const APP_BUILD_ID = __APP_BUILD_ID__;
const BUILD_ID_STORAGE_KEY = "erbi:app_build_id";
const BUILD_RESET_LOCK_KEY = "erbi:build_reset_lock";

function getFreshBuildUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("v", APP_BUILD_ID);
  return url.toString();
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  CAPA 1: Redirect path → hash para PWAs de seguimiento instaladas     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Cuando una PWA instalada se abre, el navegador carga el start_url    ║
 * ║  del manifiesto. Usamos path real (/seguimiento-aspace/TOKEN) porque  ║
 * ║  los navegadores IGNORAN el hash (#) del start_url.                   ║
 * ║                                                                        ║
 * ║  Como la app usa HashRouter en modo standalone, convertimos:           ║
 * ║    /seguimiento-aspace/TOKEN  →  /#/seguimiento-aspace/TOKEN          ║
 * ║                                                                        ║
 * ║  Esto se ejecuta ANTES de que React se monte.                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
let shouldRenderApp = true;

async function clearAppShellCache() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((registration) => registration.unregister()));
  }
}

async function enforceCurrentBuildOnly() {
  if (typeof window === "undefined") return true;

  const previousBuildId = localStorage.getItem(BUILD_ID_STORAGE_KEY);
  const resetLock = sessionStorage.getItem(BUILD_RESET_LOCK_KEY);

  if (!previousBuildId) {
    localStorage.setItem(BUILD_ID_STORAGE_KEY, APP_BUILD_ID);
    return true;
  }

  if (previousBuildId === APP_BUILD_ID) {
    sessionStorage.removeItem(BUILD_RESET_LOCK_KEY);
    return true;
  }

  // Prevent infinite reload loops: if we already tried once this session, just proceed
  if (resetLock) {
    localStorage.setItem(BUILD_ID_STORAGE_KEY, APP_BUILD_ID);
    sessionStorage.removeItem(BUILD_RESET_LOCK_KEY);
    return true;
  }

  sessionStorage.setItem(BUILD_RESET_LOCK_KEY, APP_BUILD_ID);
  localStorage.setItem(BUILD_ID_STORAGE_KEY, APP_BUILD_ID);
  await clearAppShellCache();
  window.location.replace(getFreshBuildUrl());
  return false;
}

if (typeof window !== "undefined") {
  const path = window.location.pathname;
  const hash = window.location.hash || "";

  // Caso 1: /t/TOKEN → Ya NO hacemos redirect.
  // index.html pone el hash directamente y React monta normalmente.
  // Solo nos aseguramos de que el hash esté puesto (respaldo).
  if (path.startsWith("/t/") && !hash.includes("/seguimiento-aspace/")) {
    const tkn = path.substring(3);
    if (tkn) {
      try {
        localStorage.setItem("erbi:tracking_token", tkn);
        localStorage.setItem("erbi:tracking_last_visit", Date.now().toString());
      } catch {}
      // Poner hash sin redirect - React montará con este hash
      window.location.hash = "#/seguimiento-aspace/" + tkn;
      // NO poner shouldRenderApp = false - dejar que React monte
    }
  }
  // Caso 2: /?t=TOKEN (compatibilidad con PWAs ya instaladas)
  else {
    const params = new URLSearchParams(window.location.search);
    const trackingToken = params.get("t");
    if (trackingToken && !hash.includes("/seguimiento-aspace/")) {
      window.location.replace(window.location.origin + "/t/" + trackingToken + "#/seguimiento-aspace/" + trackingToken);
      shouldRenderApp = false;
    }
    // Caso 3: /seguimiento-aspace/TOKEN (acceso directo por path)
    else if (path.startsWith("/seguimiento-aspace/") && !hash) {
      window.location.replace(window.location.origin + "/#" + path + window.location.search);
      shouldRenderApp = false;
    }
  }
}

/**
 * Recuperación anti-pantalla-en-blanco (especialmente en PWA iOS/Android):
 * - Si el SW/Cache sirve un build viejo y al recargar falla un chunk, la app queda en blanco.
 * - Detectamos esos fallos y hacemos "hard reset" (borrar caches + desregistrar SW) y recargar.
 */
let isResetting = false;

async function hardResetAndReload(reason: string, err?: unknown) {
  // Prevenir múltiples resets simultáneos
  if (isResetting) return;

  try {
    const key = "lovable:pwa_hard_reset_once";
    if (sessionStorage.getItem(key) === "1") return;

    isResetting = true;
    sessionStorage.setItem(key, "1");

    console.warn("[PWA Recovery] hard reset", { reason, err });

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("[PWA Recovery] hard reset failed", e);
  } finally {
    // Tras limpiar caché/SW, recargamos con build id para evitar una shell antigua.
    window.location.replace(getFreshBuildUrl());
  }
}

function isLikelyChunkLoadError(err: unknown) {
  const msg = typeof (err as any)?.message === "string" ? (err as any).message : typeof err === "string" ? err : "";

  // Mensajes típicos en iOS/Android PWA cuando el HTML apunta a assets ya no existentes
  return /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS|Unable to preload/.test(
    msg,
  );
}

// Captura errores de carga de chunks y recuperación automática
window.addEventListener(
  "error",
  (event) => {
    // event.error a veces viene null en iOS, usar message/filename también
    const message = (event as any)?.message || (event as any)?.error?.message || "";
    const filename = (event as any)?.filename || "";

    if (isLikelyChunkLoadError(event.error) || isLikelyChunkLoadError(message)) {
      void hardResetAndReload("window.error(chunk)", { message, filename });
      return;
    }

    // Log útil para depuración remota
    console.warn("[Global error]", { message, filename, error: (event as any)?.error });
  },
  true,
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    if (isLikelyChunkLoadError(event.reason)) {
      void hardResetAndReload("unhandledrejection(chunk)", event.reason);
      return;
    }
    // Solo loguear, no mostrar errores al usuario para refetch fallidos
    console.warn("[Unhandled rejection]", event.reason);
  },
  true,
);

// Evento que Vite emite cuando falla el preload de imports en producción
window.addEventListener("vite:preloadError", (event) => {
  void hardResetAndReload("vite:preloadError", event);
});

// Limpiar flag de reset después de carga exitosa
window.addEventListener("load", () => {
  // Dar tiempo a que la app se estabilice antes de limpiar el flag
  setTimeout(() => {
    sessionStorage.removeItem("lovable:pwa_hard_reset_once");
  }, 3000);
});

// Solo montar React si no estamos en medio de un redirect
if (shouldRenderApp) {
  void enforceCurrentBuildOnly().then((canRenderApp) => {
    if (!canRenderApp) return;
    createRoot(document.getElementById("root")!).render(<App />);
  });
}
