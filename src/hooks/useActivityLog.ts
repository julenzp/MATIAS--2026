import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SILENT_CODES = ["15995R"];

/**
 * Registra la actividad de navegación del usuario en activity_log.
 * Solo registra para usuarios no-admin (excluye SILENT_CODES).
 * Fire-and-forget: nunca bloquea la UI.
 */
export function useActivityLog(pageName: string, details?: Record<string, any>) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;

    const logActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;

        // Extraer código del email (ej: 72596f@erbi.local → 72596F)
        const code = user.email.split("@")[0]?.toUpperCase();
        if (!code || SILENT_CODES.includes(code)) return;

        logged.current = true;

        await supabase.from("activity_log" as any).insert({
          user_code: code,
          action_type: "view",
          page_name: pageName,
          details: details || {},
        });
      } catch {
        // Fire and forget
      }
    };

    logActivity();
  }, [pageName]);
}
