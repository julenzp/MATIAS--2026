import { useState } from "react";
import { useAllIncidencias } from "@/hooks/useIncidencias";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCheck, MessageSquare, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const IncidenciasEmpresaPanel = () => {
  const { incidencias, loading, openCount, responderIncidencia, deleteIncidencia } = useAllIncidencias();
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar esta incidencia definitivamente?")) return;
    setDeleting(id);
    try {
      await deleteIncidencia(id);
      toast.success("Incidencia eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const handleResponder = async (id: string) => {
    const texto = respuestas[id]?.trim();
    if (!texto) return;
    setSending(id);
    try {
      await responderIncidencia(id, texto);
      setRespuestas(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast.success("Respuesta enviada");
    } catch (err: any) {
      toast.error(err?.message || "Error al responder");
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (incidencias.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
        <p className="font-medium">No hay incidencias registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {openCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle size={18} className="text-destructive" />
          <span className="text-sm font-semibold text-destructive">{openCount} incidencia{openCount !== 1 ? 's' : ''} pendiente{openCount !== 1 ? 's' : ''} de respuesta</span>
        </div>
      )}

      {incidencias.map((inc) => (
        <Card key={inc.id} className={inc.estado === "abierta" ? "border-destructive/30" : ""}>
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold">{inc.route}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(inc.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  {" "}
                  {new Date(inc.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={inc.estado === "abierta" ? "destructive" : inc.estado === "respondida" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {inc.estado === "abierta" ? "Abierta" : inc.estado === "respondida" ? "Respondida" : "Leída"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(inc.id)}
                  disabled={deleting === inc.id}
                  title="Eliminar incidencia"
                >
                  {deleting === inc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </Button>
              </div>
            </div>

            {/* Message */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">De: <span className="font-semibold text-foreground">{inc.creado_por}</span></p>
              <p className="text-sm whitespace-pre-wrap">{inc.mensaje}</p>
            </div>

            {/* Existing response */}
            {inc.respuesta && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare size={12} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Respuesta empresa</span>
                  {inc.respondido_at && (
                    <span className="text-[10px] text-emerald-600/70">
                      {new Date(inc.respondido_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{inc.respuesta}</p>
              </div>
            )}

            {/* Read status */}
            {inc.estado === "leida" && inc.leido_at && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCheck size={14} />
                <span className="text-xs font-medium">
                  ✓ Leído por {inc.leido_por} — {new Date(inc.leido_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}

            {/* Reply input for open or responded (can update response) */}
            {(inc.estado === "abierta" || inc.estado === "respondida") && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escribe la respuesta..."
                  value={respuestas[inc.id] || ""}
                  onChange={(e) => setRespuestas(prev => ({ ...prev, [inc.id]: e.target.value }))}
                  rows={2}
                  className="resize-none text-sm flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => handleResponder(inc.id)}
                  disabled={sending === inc.id || !respuestas[inc.id]?.trim()}
                  className="gap-1.5 self-end"
                >
                  {sending === inc.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Responder
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
