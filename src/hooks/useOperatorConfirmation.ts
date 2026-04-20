import { useCallback, useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SILENT_CODES = ["15995R"];

type ActionType = "insert" | "update" | "delete";

interface ConfirmationConfig {
  actionType: ActionType;
  description?: string;
  table?: string;
  route?: string;
  pageName?: string;
  passenger_name?: string;
}

const ACTION_CONFIG: Record<ActionType, { icon: string; line1: string; line2: string; bgClass: string; borderClass: string; textClass: string }> = {
  insert: {
    icon: "✅",
    line1: "Nuevo registro guardado correctamente.",
    line2: "Será operativo a partir de mañana.",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200 dark:border-green-800",
    textClass: "text-green-800 dark:text-green-200",
  },
  update: {
    icon: "✏️",
    line1: "Cambio registrado correctamente.",
    line2: "Será operativo a partir de mañana. La asistencia de hoy no se ve afectada.",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    textClass: "text-yellow-800 dark:text-yellow-200",
  },
  delete: {
    icon: "⚠️",
    line1: "Registro eliminado correctamente.",
    line2: "El cambio se aplicará a partir de mañana.",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-800",
    textClass: "text-red-800 dark:text-red-200",
  },
};

let cachedUserCode: string | null = null;
let codeChecked = false;

async function getUserCode(): Promise<string | null> {
  if (codeChecked) return cachedUserCode;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      cachedUserCode = user.email.split("@")[0]?.toUpperCase() || null;
    }
  } catch { /* ignore */ }
  codeChecked = true;
  return cachedUserCode;
}

// Reset cache on auth change
supabase.auth.onAuthStateChange(() => {
  cachedUserCode = null;
  codeChecked = false;
});

/**
 * Shows an operator-specific confirmation toast and logs the action to activity_log.
 * Admin users (SILENT_CODES) see nothing extra.
 */
export async function showOperatorConfirmation(config: ConfirmationConfig) {
  const userCode = await getUserCode();
  if (!userCode || SILENT_CODES.includes(userCode)) return;

  const cfg = ACTION_CONFIG[config.actionType];

  // Show enhanced toast
  toast(cfg.line1, {
    description: cfg.line2,
    duration: 6000,
    icon: cfg.icon,
    className: `${cfg.bgClass} ${cfg.borderClass} border ${cfg.textClass}`,
  });

  // Log to activity_log (fire and forget)
  try {
    await supabase.from("activity_log" as any).insert({
      user_code: userCode,
      action_type: config.actionType,
      page_name: config.pageName || "Panel administración",
      details: {
        table: config.table || null,
        description: config.description || null,
        route: config.route || null,
        passenger_name: config.passenger_name || null,
      },
    });
  } catch { /* fire and forget */ }
}

/**
 * Hook to fetch today's changes for the current operator user.
 */
export function useDailyChanges() {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);

  useEffect(() => {
    getUserCode().then(setUserCode);
  }, []);

  const isOperator = userCode && !SILENT_CODES.includes(userCode);

  const fetchChanges = useCallback(async () => {
    const code = await getUserCode();
    if (!code || SILENT_CODES.includes(code)) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("activity_log" as any)
        .select("*")
        .eq("user_code", code)
        .gte("created_at", `${today}T00:00:00`)
        .neq("action_type", "view")
        .order("created_at", { ascending: false });
      setChanges(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  return { changes, loading, fetchChanges, isOperator };
}
