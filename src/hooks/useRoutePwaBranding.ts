import { useEffect } from "react";

const DEFAULT_MANIFEST_HREF = "/manifest.webmanifest";

const ROUTE_MANIFEST_BY_CODE: Record<string, string> = {
  MATIA: "/manifest-matia.webmanifest",
  ASPACE: "/manifest-aspace.webmanifest",
  AMARAEN: "/manifest-amaraen-diario.webmanifest",
  "AMARAEN FINDE": "/manifest-amaraen.webmanifest",
  EGURTZEGI: "/manifest-egurtzegi.webmanifest",
  BERMINGHAM: "/manifest-bermingham.webmanifest",
  LASARTE: "/manifest-lasarte.webmanifest",
  LAMOROUSE: "/manifest-lamorouse.webmanifest",
  EGILUZE: "/manifest-egiluze.webmanifest",
  IGELDO: "/manifest-igeldo.webmanifest",
  FRAISORO: "/manifest-fraisoro.webmanifest",
  FRAISORO_2: "/manifest-fraisoro2.webmanifest",
  ARGIXAO_1: "/manifest-argixao1.webmanifest",
  ARGIXAO_2: "/manifest-argixao2.webmanifest",
};

function ensureManifestLink(): HTMLLinkElement {
  const existing = document.querySelector<HTMLLinkElement>(
    'link[rel="manifest"]#pwa-manifest'
  );
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "manifest";
  link.id = "pwa-manifest";
  link.href = DEFAULT_MANIFEST_HREF;
  document.head.appendChild(link);
  return link;
}

/**
 * En modo app (app=true) fuerza un manifest específico por ruta para que:
 * - al instalar desde esa URL, el icono abra DIRECTAMENTE esa ruta
 * - no vuelva a la web raíz (/) por culpa del HashRouter en standalone
 */
export function useRoutePwaBranding(input: {
  routeCode: string;
  routeName: string;
  enabled: boolean;
}) {
  const { routeCode, routeName, enabled } = input;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const link = ensureManifestLink();
    const prevHref = link.getAttribute("href") || DEFAULT_MANIFEST_HREF;
    const nextHref = ROUTE_MANIFEST_BY_CODE[routeCode] || prevHref;

    const prevTitle = document.title;
    document.title = `${routeName} · ERBI`;

    const appleTitleMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-title"]'
    );
    const prevAppleTitle = appleTitleMeta?.getAttribute("content") ?? null;
    if (appleTitleMeta) appleTitleMeta.setAttribute("content", routeName);

    if (nextHref !== prevHref) link.setAttribute("href", nextHref);

    return () => {
      document.title = prevTitle;
      if (appleTitleMeta && prevAppleTitle !== null) {
        appleTitleMeta.setAttribute("content", prevAppleTitle);
      }
      link.setAttribute("href", prevHref);
    };
  }, [enabled, routeCode, routeName]);
}
