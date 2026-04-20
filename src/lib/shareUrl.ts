// Utilidades para generar enlaces compartibles que funcionen igual en web, PWA y app nativa (Capacitor).
// Objetivo: evitar enlaces como capacitor://localhost o http://localhost al compartir desde móvil.

import { Capacitor } from "@capacitor/core";

const DEFAULT_PUBLIC_APP_URL = "https://companion-route-planner.lovable.app";

function stripTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getPublicAppBaseUrl(): string {
  const envUrl = (import.meta as any)?.env?.VITE_PUBLIC_APP_URL as string | undefined;
  if (typeof envUrl === "string" && /^https?:\/\//i.test(envUrl)) {
    return stripTrailingSlash(envUrl);
  }

  // Si estamos en un dominio público real (preview o publicado), úsalo.
  // Evita origins locales típicos de Capacitor (http://localhost) o dev.
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isHttp = /^https?:\/\//i.test(origin);
    const isLocal = /localhost|127\.0\.0\.1/i.test(origin);
    if (isHttp && !isLocal) {
      return stripTrailingSlash(origin);
    }
  }

  return DEFAULT_PUBLIC_APP_URL;
}

/**
 * Detecta si la PWA está instalada y corriendo en modo standalone.
 */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Genera una URL compartible que funciona en todos los contextos.
 *
 * IMPORTANTE: Para PWAs instaladas y apps nativas, usamos rutas con hash (#)
 * porque evitan problemas de 404 cuando el servidor no soporta SPA routing.
 *
 * Ejemplos:
 * - Web normal: https://companion-route-planner.lovable.app/matia?app=true
 * - PWA instalada / app nativa: https://companion-route-planner.lovable.app/#/matia?app=true
 */
export function buildAppShareUrl(input: { path: string } | { url: string }): string {
  const base = getPublicAppBaseUrl();

  // Usar SIEMPRE hash routing para máxima compatibilidad:
  // - evita 404 en hosts que no soportan SPA routing (incluso en móvil)
  // - funciona igual en web, PWA instalada y app nativa
  const useHashRouting = true;

  if ("path" in input) {
    const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
    
    if (useHashRouting) {
      // Hash URL: https://domain.com/#/path?app=true
      const hashPath = path.includes('?') 
        ? path.replace('?', '?app=true&').replace('&$', '') 
        : `${path}?app=true`;
      return `${base}/#${hashPath}`;
    }
    
    // URL normal: https://domain.com/path?app=true
    const u = new URL(path, base);
    u.searchParams.set("app", "true");
    return u.toString();
  }

  // Si nos pasan una URL completa (por ejemplo window.location.href), la normalizamos
  // para que apunte siempre al dominio público.
  const current = new URL(input.url);
  
  if (useHashRouting) {
    const pathname = current.hash.startsWith('#') 
      ? current.hash.slice(1) 
      : current.pathname;
    const params = new URLSearchParams(current.search);
    params.set("app", "true");
    const queryString = params.toString();
    return `${base}/#${pathname}${queryString ? '?' + queryString : ''}`;
  }

  current.searchParams.set("app", "true");
  const normalized = new URL(current.pathname + current.search + current.hash, base);
  return normalized.toString();
}
