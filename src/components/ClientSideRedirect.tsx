import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Permite que instalaciones PWA/hosts estáticos que devuelven 404 en rutas profundas
 * puedan redirigir a "/" y luego volver a la ruta original.
 *
 * 404.html guarda la ruta en sessionStorage y recarga "/".
 * 
 * IMPORTANTE para apps móviles:
 * - Este componente restaura la navegación después de un 404 redirect
 * - Se ejecuta inmediatamente al montar para evitar flash de contenido incorrecto
 */
export function ClientSideRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Solo procesar una vez para evitar loops
    if (hasProcessedRef.current) return;
    
    const key = "lovable:pwa_redirect";
    const redirect = sessionStorage.getItem(key);
    
    if (!redirect) return;
    
    // Marcar como procesado inmediatamente
    hasProcessedRef.current = true;
    sessionStorage.removeItem(key);

    const current = location.pathname + location.search + location.hash;
    
    // Evitar redirects innecesarios
    if (redirect === current || redirect === "/" || redirect === "/index.html" || redirect === "") {
      return;
    }

    // Log para debugging en desarrollo
    if (import.meta.env.DEV) {
      console.log('[PWA Redirect] Restaurando ruta:', redirect);
    }

    // Pequeño delay para asegurar que React Router esté listo
    requestAnimationFrame(() => {
      navigate(redirect, { replace: true });
    });
  }, [navigate, location.pathname, location.search, location.hash]);

  return null;
}
