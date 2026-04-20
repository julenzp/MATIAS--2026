import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Bell, Info, Megaphone, X, Check, Trash2, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Notification {
  id: string;
  route: string;
  message: string;
  priority: string;
  created_at: string;
}

interface RouteNotificationsProps {
  routeCode: string;
  isModalMode?: boolean; // Para renderizar solo el modal a pantalla completa (avisos bloqueantes)
  isAppMode?: boolean;   // Para renderizar avisos no-bloqueantes en modo app
  enableRealtime?: boolean;
  pollIntervalMs?: number;
}

// Generate or get device ID for tracking
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("erbi_device_id");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("erbi_device_id", deviceId);
  }
  return deviceId;
};

export const RouteNotifications = ({
  routeCode,
  isModalMode = false,
  isAppMode = false,
  enableRealtime = true,
  pollIntervalMs = 30_000,
}: RouteNotificationsProps) => {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Reset state on route change to avoid showing stale data
    setNotifications([]);
    setReadIds(new Set());
    setDismissedIds(new Set());
    setIsReady(false);
    setFetchError(false);
    
    // Timeout de seguridad: si la carga tarda > 5s, desbloquear la app igualmente
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !isReady) {
        console.warn("[RouteNotifications] Safety timeout reached, unblocking app");
        setIsReady(true);
        setFetchError(true);
      }
    }, 5000);
    
    const init = async () => {
      try {
        await Promise.all([fetchNotifications(), fetchReadStatus()]);
      } catch (e) {
        console.warn("Error fetching notifications:", e);
        if (mountedRef.current) setFetchError(true);
      } finally {
        if (mountedRef.current) {
          setIsReady(true);
          clearTimeout(safetyTimeout);
        }
      }
    };
    
    init();

    const shouldUseRealtime =
      enableRealtime && (typeof navigator === "undefined" || navigator.onLine);

    if (typeof window === "undefined") return () => { mountedRef.current = false; clearTimeout(safetyTimeout); };

    // Si no usamos realtime, hacemos polling seguro (evita bloqueos por websocket)
    if (!shouldUseRealtime) {
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchNotifications();
          fetchReadStatus();
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);

      const intervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        fetchNotifications();
        fetchReadStatus();
      }, pollIntervalMs);

      return () => {
        mountedRef.current = false;
        clearTimeout(safetyTimeout);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.clearInterval(intervalId);
      };
    }

    // Subscribe to realtime updates - sin filtro para capturar deletes
    const channel = supabase
      .channel(`route-notifications-display-${routeCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_notifications'
        },
        (payload) => {
          // Si es DELETE o la ruta coincide, refrescar
          if (payload.eventType === 'DELETE' || 
              (payload.new && (payload.new as any).route === routeCode) ||
              (payload.old && (payload.old as any).route === routeCode)) {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
    };
  }, [routeCode, enableRealtime, pollIntervalMs]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("route_notifications")
        .select("*")
        .eq("route", routeCode)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (!mountedRef.current) return;

      if (!error && data) {
        setNotifications(data);
        
        // Limpiar IDs de notificaciones que ya no existen
        const existingIds = new Set(data.map(n => n.id));
        setReadIds(prev => {
          const cleaned = new Set([...prev].filter(id => existingIds.has(id)));
          return cleaned.size !== prev.size ? cleaned : prev;
        });
        setDismissedIds(prev => {
          const cleaned = new Set([...prev].filter(id => existingIds.has(id)));
          return cleaned.size !== prev.size ? cleaned : prev;
        });
      } else if (error) {
        console.error("Error fetching notifications:", error);
      }
    } catch (err) {
      console.error("Error in fetchNotifications:", err);
    }
  };

  const fetchReadStatus = async () => {
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("route", routeCode)
      .eq("device_id", deviceId);

    if (data) {
      setReadIds(new Set(data.map(r => r.notification_id)));
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    if (readIds.has(notificationId)) return;

    const deviceId = getDeviceId();
    
    try {
      const { error } = await supabase.from("notification_reads").insert({
        notification_id: notificationId,
        route: routeCode,
        device_id: deviceId,
        user_agent: navigator.userAgent,
        read_at: new Date().toISOString(),
      });

      if (!error) {
        setReadIds(prev => new Set([...prev, notificationId]));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, [readIds, routeCode]);

  const handleDismiss = async (id: string) => {
    await markAsRead(id);
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const handleConfirmRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("route_notifications")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Error al eliminar el aviso");
        console.error("Error deleting notification:", error);
      } else {
        toast.success("Aviso eliminado");
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      toast.error("Error al eliminar el aviso");
      console.error("Error deleting notification:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Avisos no descartados localmente
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));
  
  // Avisos NO leídos (para bloqueo en modo app)
  const unreadNotifications = visibleNotifications.filter(n => !readIds.has(n.id));

  // Estilo uniforme: fondo gris claro con texto de alto contraste
  const getPriorityStyles = (priority: string) => {
    const baseStyles = {
      bg: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
      text: "text-gray-900 dark:text-gray-100"
    };
    
    switch (priority) {
      case "urgent":
        return {
          ...baseStyles,
          icon: <AlertTriangle size={28} className="text-gray-700 dark:text-gray-300 flex-shrink-0 animate-pulse" />
        };
      case "high":
        return {
          ...baseStyles,
          icon: <Megaphone size={28} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
        };
      case "normal":
        return {
          ...baseStyles,
          icon: <Bell size={28} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
        };
      default:
        return {
          ...baseStyles,
          icon: <Info size={28} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
        };
    }
  };

  // MODO MODAL: Solo bloquea con avisos URGENTES o de ALTA prioridad sin leer
  const blockingNotifications = unreadNotifications.filter(
    n => n.priority === "urgent" || n.priority === "high"
  );

  // Avisos no bloqueantes (normal/low) - también filtrados por lectura
  // Una vez leído, no se vuelve a mostrar
  const nonBlockingNotifications = unreadNotifications.filter(
    n => n.priority !== "urgent" && n.priority !== "high"
  );

  if (isModalMode) {
    // No bloquear la app mientras se cargan las notificaciones o si hay error
    // Solo bloquear si hay avisos urgentes/high sin leer
    if (!isReady || fetchError || blockingNotifications.length === 0) return null;
    
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
          {/* Header del modal */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 mb-4">
              <BellRing size={40} className="text-destructive animate-shake" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              ¡Aviso Importante!
            </h2>
            <p className="text-muted-foreground mt-2">
              Confirma que has leído {blockingNotifications.length === 1 ? 'este aviso' : 'estos avisos'} para continuar
            </p>
            {/* Botón de salto de emergencia - siempre visible */}
          </div>
          {/* Avisos urgentes/high que bloquean */}
          {blockingNotifications.map((notification) => {
            const styles = getPriorityStyles(notification.priority);
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex flex-col gap-4 p-6 rounded-2xl border-3 shadow-xl",
                  styles.bg,
                  "border-4"
                )}
              >
                <div className="flex items-start gap-4">
                  {styles.icon}
                  <p className={cn("flex-1 text-lg font-semibold leading-relaxed", styles.text)}>
                    {notification.message}
                  </p>
                </div>
                
                <button
                  onClick={() => handleConfirmRead(notification.id)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold transition-all",
                    "bg-green-600 hover:bg-green-700 text-white shadow-lg active:scale-95"
                  )}
                >
                  <Check size={24} />
                  Irakurrita / Confirmar Leído
                </button>

                {/* Botón eliminar solo para admin */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(notification.id)}
                    disabled={deletingId === notification.id}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      "bg-red-600 hover:bg-red-700 text-white",
                      deletingId === notification.id && "opacity-50 cursor-not-allowed"
                    )}
                    title="Eliminar aviso permanentemente"
                  >
                    <Trash2 size={18} />
                    Ezabatu / Eliminar Aviso
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // En modo app (no modal), solo mostrar avisos NO bloqueantes
  // Los bloqueantes (urgent/high) se manejan en el modal
  const notificationsToShow = isAppMode ? nonBlockingNotifications : visibleNotifications;

  // MODO WEB NORMAL o APP (avisos no bloqueantes): Vista compacta de avisos
  if (notificationsToShow.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {notificationsToShow.map((notification) => {
        const styles = getPriorityStyles(notification.priority);
        const isRead = readIds.has(notification.id);
        
        return (
          <div
            key={notification.id}
            className={cn(
              "flex flex-col gap-2 p-4 rounded-xl border-2 animate-fade-in shadow-md",
              styles.bg,
              isRead && "opacity-75"
            )}
          >
            <div className="flex items-start gap-3">
              {styles.icon}
              <p className={cn("flex-1 text-sm font-medium leading-relaxed", styles.text)}>
                {notification.message}
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-1">
              {!isRead ? (
                <button
                  onClick={() => handleConfirmRead(notification.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  )}
                >
                  <Check size={14} />
                  Irakurrita / Leído
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 dark:text-green-400 font-medium">
                  <Check size={14} />
                  Konfirmatua / Confirmado
                </span>
              )}
              
              {/* Botón eliminar solo para admin */}
              {isAdmin && (
                <button
                  onClick={() => handleDelete(notification.id)}
                  disabled={deletingId === notification.id}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    "bg-red-600 hover:bg-red-700 text-white shadow-sm",
                    deletingId === notification.id && "opacity-50 cursor-not-allowed"
                  )}
                  title="Eliminar aviso permanentemente"
                >
                  <Trash2 size={14} />
                  Ezabatu / Eliminar
                </button>
              )}
              
              <button
                onClick={() => handleDismiss(notification.id)}
                className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Descartar"
              >
                <X size={16} className={styles.text} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
