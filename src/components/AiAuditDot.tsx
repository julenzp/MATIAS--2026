import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, XCircle, Loader2, Search, MessageCircle, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AiLog {
  id: string;
  created_at: string;
  query_text: string;
  response_text: string | null;
  user_email: string | null;
  route_context: string | null;
  ai_evaluation: string | null;
  ai_evaluation_score: number | null;
  detected_intent: string | null;
  tokens_used: number | null;
}

interface EvaluationResult {
  score: number;
  is_correct: boolean;
  evaluation: string;
  improvement: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const scoreColor = (score: number | null) => {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 4) return "bg-green-100 text-green-800";
  if (score >= 3) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

export const AiAuditDot = () => {
  const { isAdmin, isMatia } = useAuth();
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<Record<string, EvaluationResult>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    
    const fetchLogs = async () => {
      if (isAdmin) {
        // Admin can query directly via RLS
        const { data } = await supabase
          .from("erbi_ia_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        setLogs((data as AiLog[]) || []);
      } else if (isMatia) {
        // MATIA fetches via edge function (no direct RLS access)
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-ai-log`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ action: "list_logs" }),
          });
          if (response.ok) {
            const data = await response.json();
            setLogs(data.logs || []);
          }
        } catch (e) {
          console.error("Error fetching logs for matia:", e);
        }
      }
      setLoading(false);
    };
    
    fetchLogs();
  }, [open, isAdmin, isMatia]);

  const evaluateLog = async (logId: string) => {
    setEvaluating(logId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-ai-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ log_id: logId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Error evaluando");
      }

      const result: EvaluationResult = await response.json();
      setImprovements((prev) => ({ ...prev, [logId]: result }));

      // Update local state with score
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, ai_evaluation_score: result.score, ai_evaluation: result.evaluation }
            : l
        )
      );

      toast.success(`Evaluación: ${result.score}/5`);
    } catch (e: any) {
      toast.error(e.message || "Error al evaluar");
    } finally {
      setEvaluating(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("¿Borrar TODOS los registros de auditoría AI? Esta acción no se puede deshacer.")) return;
    try {
      const { error } = await supabase.from("erbi_ia_logs").delete().not("id", "is", null);
      if (error) throw error;
      setLogs([]);
      setImprovements({});
      toast.success("Registros de auditoría borrados");
    } catch (e: any) {
      toast.error(e.message || "Error al borrar registros");
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      {/* Punto negro discreto */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[9999] w-3 h-3 rounded-full bg-foreground/30 hover:bg-foreground/60 transition-colors cursor-default"
        aria-label="AI Audit"
        style={{ opacity: 0.4 }}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-4 pb-2 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">🔍 Auditoría AI Erbi</SheetTitle>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Últimas 50 consultas · Evalúa calidad con IA
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                className="gap-1.5 text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                Borrar todo
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Cargando...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Sin consultas registradas</div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => {
                  const hasScore = log.ai_evaluation_score != null;
                  const isCorrect = hasScore && log.ai_evaluation_score! >= 4;
                  const isBad = hasScore && log.ai_evaluation_score! <= 2;
                  const improvement = improvements[log.id];

                  return (
                    <div key={log.id} className="p-4 space-y-2">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Green/Red indicator */}
                          {hasScore ? (
                            isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            ) : isBad ? (
                              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                            )
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at!), "dd MMM HH:mm", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {log.route_context && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {log.route_context}
                            </Badge>
                          )}
                          {hasScore && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${scoreColor(log.ai_evaluation_score)}`}>
                              {log.ai_evaluation_score}/5
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Question */}
                      <p className="text-sm font-medium text-foreground leading-snug">
                        ❓ {log.query_text}
                      </p>

                      {/* Response */}
                      {log.response_text && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          💬 {log.response_text}
                        </p>
                      )}

                      {/* Existing evaluation */}
                      {log.ai_evaluation && (
                        <p className="text-[11px] italic text-muted-foreground/70">
                          📝 {log.ai_evaluation}
                        </p>
                      )}

                      {/* Improvement suggestion (after evaluation) */}
                      {improvement && (
                        <div className={`text-[11px] p-2 rounded-md ${improvement.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className="font-semibold mb-1">
                            {improvement.is_correct ? '✅ Respuesta correcta' : '❌ Respuesta mejorable'}
                          </p>
                          <p className="text-muted-foreground">
                            💡 {improvement.improvement}
                          </p>
                        </div>
                      )}

                      {/* User info + action buttons */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">
                          {log.user_email && `👤 ${log.user_email}`}
                        </p>
                        <div className="flex items-center gap-1">
                          {/* Revisar en chatbot */}
                          {log.query_text && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 gap-1 text-primary hover:text-primary"
                              onClick={() => {
                                setOpen(false);
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('erbi:open-with-query', { detail: { query: log.query_text } }));
                                }, 300);
                              }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              Revisar
                            </Button>
                          )}
                          {/* Confirmar como correcta */}
                          {log.response_text && !isCorrect && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setImprovements((prev) => ({ ...prev, [log.id]: { score: 5, is_correct: true, evaluation: "Confirmado manualmente por admin", improvement: "" } }));
                                setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, ai_evaluation_score: 5, ai_evaluation: "✅ Confirmado por admin" } : l));
                                toast.success("Respuesta confirmada como correcta");
                              }}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              Confirmar
                            </Button>
                          )}
                          {/* Evaluar con IA */}
                          {log.response_text && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={() => evaluateLog(log.id)}
                              disabled={evaluating === log.id}
                            >
                              {evaluating === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3" />
                              )}
                              {hasScore ? "Re-evaluar" : "Evaluar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};
