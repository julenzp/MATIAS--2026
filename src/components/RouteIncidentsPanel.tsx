import { useState, useMemo } from "react";
import { useIncidencias, Incidencia } from "@/hooks/useIncidencias";
import { useSimpleSpeechRecognition } from "@/hooks/useSimpleSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  Mic,
  MicOff,
  Send,
  Loader2,
  Trash2,
  Calendar as CalendarIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { showOperatorConfirmation } from "@/hooks/useOperatorConfirmation";

interface RouteIncidentsPanelProps {
  routeCode: string;
}

export const RouteIncidentsPanel = ({ routeCode }: RouteIncidentsPanelProps) => {
  const { incidencias, loading, addIncidencia, deleteIncidencia, marcarLeida } = useIncidencias(routeCode);
  const {
    isListening,
    transcript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSimpleSpeechRecognition();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const sortedIncidencias = useMemo(() => {
    return [...incidencias].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [incidencias]);

  const featuredIncidencia = useMemo(() => {
    return (
      sortedIncidencias.find((inc) => inc.estado === "respondida" && inc.respuesta && !inc.leido_at) ??
      sortedIncidencias.find((inc) => inc.estado === "abierta") ??
      sortedIncidencias[0] ??
      null
    );
  }, [sortedIncidencias]);

  const historyIncidencias = useMemo(
    () => sortedIncidencias.filter((inc) => inc.id !== featuredIncidencia?.id),
    [sortedIncidencias, featuredIncidencia]
  );

  const featuredTitle = !featuredIncidencia
    ? "Incidencia activa"
    : featuredIncidencia.estado === "respondida" && featuredIncidencia.respuesta && !featuredIncidencia.leido_at
      ? "Respuesta pendiente"
      : featuredIncidencia.estado === "abierta"
        ? "Incidencia activa"
        : "Última incidencia";

  const currentText = isListening ? transcript || text : text;

  // Get display name for creado_por
  const getDisplayName = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const code = user.email.split("@")[0]?.toUpperCase();
        // Try to get display_name from access_codes
        const { data } = await supabase
          .from("access_codes")
          .select("display_name")
          .eq("code", code)
          .maybeSingle();
        return data?.display_name || code || "Auxiliar";
      }
    } catch {}
    return "Auxiliar";
  };

  // Mark a specific incidencia as read manually
  const handleMarcarLeida = async (id: string) => {
    try {
      const displayName = await getDisplayName();
      await marcarLeida(id, displayName);
      toast.success("Marcada como leída");
    } catch {
      toast.error("Error al marcar como leída");
    }
  };

  const handleStopListening = () => {
    const result = stopListening();
    if (result) {
      setText((prev) => (prev ? prev + " " + result : result));
    }
  };

  const handleSend = async () => {
    const msg = currentText.trim();
    if (!msg) return;
    setSending(true);
    try {
      const displayName = await getDisplayName();
      await addIncidencia(msg, displayName);
      setText("");
      resetTranscript();
      toast.success("Incidencia registrada");
      showOperatorConfirmation({ actionType: 'insert', description: msg.substring(0, 80), table: 'Incidencias', route: routeCode });
    } catch (err: any) {
      console.error("[IncidentsPanel] Send error:", err);
      toast.error(err?.message || "Error al guardar la incidencia");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncidencia(id);
      toast.success("Incidencia eliminada");
      showOperatorConfirmation({ actionType: 'delete', description: 'Incidencia eliminada', table: 'Incidencias', route: routeCode });
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Incidencia[]>();
    historyIncidencias.forEach((inc) => {
      const dateKey = inc.created_at ? inc.created_at.split("T")[0] : "unknown";
      const list = map.get(dateKey) || [];
      list.push(inc);
      map.set(dateKey, list);
    });
    // Sort dates descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historyIncidencias]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "unknown") return "Sin fecha";
    const d = new Date(dateStr + "T12:00:00");
    if (Number.isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "--:--";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const openCount = incidencias.filter(
    (i) => i.estado === "abierta"
  ).length;

  const unreadResponseCount = incidencias.filter(
    (i) => i.estado === "respondida" && i.respuesta && !i.leido_at
  ).length;

  const hasGreen = unreadResponseCount > 0;
  const badgeCount = hasGreen ? unreadResponseCount : openCount;

  const renderIncidenciaThread = (inc: Incidencia, featured = false) => (
    <div className={`space-y-1.5 ${featured ? "animate-fade-in" : ""}`}>
      <div className={`flex items-start gap-2 p-3 rounded-xl border border-border bg-card text-sm ${featured ? "shadow-sm" : ""}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-semibold text-primary">{inc.creado_por}</span>
            <span className="text-[10px] text-muted-foreground">{formatTime(inc.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{inc.mensaje}</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm("¿Eliminar esta incidencia?")) {
              handleDelete(inc.id);
            }
          }}
          className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
          aria-label="Eliminar incidencia"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {inc.respuesta ? (
        <div className={`ml-3 flex items-start gap-2 incident-response-card ${featured ? "incident-response-card--featured" : ""}`}>
          <MessageSquare size={16} className="incident-response-icon shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold incident-response-label">Empresa</span>
              {inc.respondido_at && (
                <span className="text-[10px] incident-response-meta">{formatTime(inc.respondido_at)}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words font-semibold incident-response-body">{inc.respuesta}</p>
            {inc.leido_at ? (
              <p className="text-[10px] mt-1 incident-response-meta">
                ✓ Leído por {inc.leido_por} a las {formatTime(inc.leido_at)}
              </p>
            ) : (
              <button
                onClick={() => handleMarcarLeida(inc.id)}
                className="incident-response-read-button"
              >
                ✓ Marcar como leída
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (window.confirm("¿Eliminar esta respuesta y la incidencia completa?")) {
                handleDelete(inc.id);
              }
            }}
            className="incident-response-delete shrink-0 mt-0.5"
            aria-label="Eliminar respuesta"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <div className={`ml-3 incident-pending-card ${featured ? "incident-pending-card--featured" : ""}`}>
          <span className="text-[10px] font-semibold uppercase tracking-wide">Pendiente</span>
          <span className="text-xs font-medium">La contestación de la empresa aparecerá aquí en cuanto llegue.</span>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-lg transition-colors cursor-pointer ${
            hasGreen
              ? "bg-secondary/15 hover:bg-secondary/25 text-secondary"
              : "bg-destructive/10 hover:bg-destructive/20 text-destructive"
          }`}
          aria-label="Incidencias"
        >
          <AlertTriangle size={44} strokeWidth={2.5} className={`drop-shadow-sm ${hasGreen ? "animate-pulse" : ""}`} />
          <span className="text-sm font-extrabold leading-tight">
            {hasGreen ? "Respuesta" : "Incidencias"}
          </span>
          {badgeCount > 0 && (
            <span className={`absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${
              hasGreen ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"
            }`}>
              {badgeCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-destructive" />
            Incidencias — {routeCode}
          </SheetTitle>
        </SheetHeader>

        {/* Input area */}
        <div className="flex flex-col gap-2 pt-2 border-b border-border pb-4">
          <Textarea
            placeholder="Describe la incidencia..."
            value={currentText}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="resize-none text-base"
            disabled={isListening}
          />
          {speechError && (
            <p className="text-xs text-destructive">{speechError}</p>
          )}
          <div className="flex gap-2">
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={isListening ? handleStopListening : startListening}
                className="gap-1.5"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                {isListening ? "Parar" : "Voz"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sending || !currentText.trim()}
              className="gap-1.5 ml-auto"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Enviar
            </Button>
          </div>

          <div className="incident-live-slot">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                <span className="text-sm font-semibold">{featuredTitle}</span>
              </div>
              {featuredIncidencia?.created_at && (
                <span className="text-[11px] text-muted-foreground text-right">
                  {formatDate(featuredIncidencia.created_at.split("T")[0])} · {formatTime(featuredIncidencia.created_at)}
                </span>
              )}
            </div>

            <div className="mt-3">
              {featuredIncidencia ? (
                renderIncidenciaThread(featuredIncidencia, true)
              ) : (
                <div className="incident-live-empty">
                  Envía una incidencia y verás aquí debajo el hueco fijo para leer la contestación de la empresa.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Incident list grouped by date */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !featuredIncidencia ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Sin incidencias registradas
            </p>
          ) : grouped.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay más incidencias en el historial
            </p>
          ) : (
            <>
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Historial reciente
                </span>
              </div>
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-1.5 sticky top-6 bg-background py-1 z-10">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {formatDate(date)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({items.length})
                    </span>
                  </div>
                  <div className="space-y-3 pl-1">
                    {items.map((inc) => (
                      <div key={inc.id}>{renderIncidenciaThread(inc)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
