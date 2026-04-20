import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, Send, Trash2, Mic, MicOff, FileText, Clock, AlertTriangle, Calendar, Share2, Check, Volume2, VolumeX, AudioLines, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoute } from "@/context/RouteContext";
import { useSimpleSpeechRecognition } from "@/hooks/useSimpleSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import rabbitIcon from "@/assets/ai-rabbit-icon.png";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { markdownToStyledHtml } from "@/lib/markdownToHtml";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  source?: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: "Rutas activas hoy", query: "¿Qué rutas están activas hoy?", icon: Calendar },
  { label: "Incidencias abiertas", query: "¿Qué incidencias siguen abiertas?", icon: AlertTriangle },
  { label: "Usuarios registrados", query: "¿Cuántos usuarios hay registrados?", icon: Clock },
  { label: "Resumen de hoy", query: "Hazme un resumen del servicio de hoy", icon: FileText },
];

interface AIAssistantButtonProps {
  autoOpen?: boolean;
  matiaMode?: boolean;
  fullWidth?: boolean;
}

export const AIAssistantButton = ({ autoOpen = false, matiaMode = false, fullWidth = false }: AIAssistantButtonProps) => {
  const { currentRoute } = useRoute();
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const recognition = useSimpleSpeechRecognition();
  const [isListening, setIsListening] = useState(false);
  const tts = useTextToSpeech();
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen]);

  

  const handleSpeak = (msg: Message) => {
    if ((tts.isSpeaking || tts.isLoading) && speakingMsgId === msg.id) {
      tts.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msg.id);
      tts.speak(msg.content);
      // Don't clear speakingMsgId here — useEffect below handles it
    }
  };

  // Clear speakingMsgId when audio finishes naturally
  useEffect(() => {
    if (!tts.isSpeaking && !tts.isLoading && speakingMsgId) {
      setSpeakingMsgId(null);
    }
  }, [tts.isSpeaking, tts.isLoading]);

  useEffect(() => {
    if (recognition.transcript) setTextInput(recognition.transcript);
  }, [recognition.transcript]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendQuery = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user", content: query, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const isMatiaSession = !session && localStorage.getItem('erbi:matia_session') === 'true';

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      };
      if (isMatiaSession) {
        headers["X-Matia-Session"] = "true";
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erbi-ia-query`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ query, route: currentRoute }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error en la consulta");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          intent: data.intent,
          source: data.source,
          timestamp: data.timestamp || new Date().toISOString(),
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error.message || "El servicio no está disponible. Inténtalo de nuevo.",
          timestamp: new Date().toISOString(),
        },
      ]);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentRoute, toast]);

  // Listen for external "open with query" events (from Dashboard Inteligente)
  useEffect(() => {
    const handler = (e: CustomEvent<{ query: string }>) => {
      setIsOpen(true);
      setTimeout(() => sendQuery(e.detail.query), 300);
    };
    window.addEventListener("erbi:open-with-query", handler as EventListener);
    return () => window.removeEventListener("erbi:open-with-query", handler as EventListener);
  }, [sendQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendQuery(textInput.trim());
      if (isListening) {
        recognition.stopListening();
        setIsListening(false);
      }
      recognition.resetTranscript();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      const final = recognition.stopListening();
      setIsListening(false);
      const text = (final || textInput || "").trim();
      if (text) {
        // Auto-send the voice message
        recognition.resetTranscript();
        sendQuery(text);
        setTextInput("");
      }
    } else {
      recognition.resetTranscript();
      setTextInput("");
      recognition.startListening();
      setIsListening(true);
    }
  };

  const handleClear = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy **BUSI** 🐇, tu asistente inteligente de Erbi Bus. ¿En qué te puedo ayudar hoy?',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleShareMessage = async (msg: Message) => {
    const text = `📊 ERBI IA — ${new Date(msg.timestamp).toLocaleString("es-ES")}\n\n${msg.content}${msg.source && msg.source !== "ninguna" ? `\n\n📎 Fuente: ${msg.source}` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "ERBI IA - Datos", text });
        return;
      } catch {
        // User cancelled or not supported, fall through to copy
      }
    }

    // Try rich HTML copy first
    try {
      const html = markdownToStyledHtml(msg.content);
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "📋 Copiado con formato", description: "Pega en Word, Docs o PowerPoint y se verá profesional." });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
      } catch {
        toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" });
      }
    }
  };

  const handleExport = () => {
    // Export only the last query-response pair (active consultation), never the full chat summary
    const realMessages = messages.filter(m => m.id !== 'welcome');
    let lastAssistantIdx = -1;
    for (let i = realMessages.length - 1; i >= 0; i--) {
      if (realMessages[i].role === 'assistant') { lastAssistantIdx = i; break; }
    }
    if (lastAssistantIdx < 0) return;

    const lastAssistant = realMessages[lastAssistantIdx];
    let lastUser: Message | null = null;
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (realMessages[i].role === 'user') { lastUser = realMessages[i]; break; }
    }

    let printContent = '';
    if (lastUser) {
      printContent += `[CONSULTA] ${new Date(lastUser.timestamp).toLocaleString("es-ES")}\n${lastUser.content}\n\n---\n\n`;
    }
    printContent += `[RESPUESTA] ${new Date(lastAssistant.timestamp).toLocaleString("es-ES")}\n${lastAssistant.content}${lastAssistant.source ? `\nFuente: ${lastAssistant.source}` : ""}\n`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<html><head><title>ERBI IA - Consulta</title><style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:13px;line-height:1.6;}</style></head><body>${printContent}</body></html>`
      );
      w.document.close();
      w.print();
    }
  };

  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: '¡Hola! Soy **BUSI** 🐇, tu asistente inteligente de Erbi Bus. ¿En qué te puedo ayudar hoy?',
    timestamp: new Date().toISOString(),
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) {
        tts.stop();
        setSpeakingMsgId(null);
        setMessages([]);
      } else {
        setMessages([welcomeMessage]);
      }
      setIsOpen(open);
    }}>
      <SheetTrigger asChild>
        {fullWidth && matiaMode ? (
          <button
            className="relative group w-full flex items-center gap-5 px-7 rounded-xl border-[3px] border-black bg-white text-[#E8007D] hover:bg-[#FFF0F7] transition-all duration-300 active:scale-[0.98]"
            style={{ minHeight: 80, boxShadow: '0 8px 24px rgba(232, 0, 125, 0.35)' }}
            aria-label="Asistente AI"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8007D]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </div>
            <img src={rabbitIcon} alt="AI Assistant" className="relative w-12 h-12 shrink-0 object-contain drop-shadow-md" />
            {isLoading && (
              <div className="absolute top-2 left-14 w-5 h-5 rounded-full bg-[#E8007D] flex items-center justify-center shadow-md">
                <Loader2 size={12} className="text-white animate-spin" />
              </div>
            )}
            <div className="relative flex flex-col items-start flex-1 min-w-0">
              <span className="font-extrabold leading-tight tracking-tight" style={{ fontSize: 22 }}>AI Erbi</span>
              <span className="leading-tight font-medium text-[#E8007D]/70" style={{ fontSize: 14 }}>Asistente Inteligente</span>
            </div>
            <div className="relative text-[#E8007D]/40 group-hover:text-[#E8007D]/80 transition-colors">
              <ChevronDown size={22} className="-rotate-90" />
            </div>
          </button>
        ) : (
          <button
            className={cn(
              "relative group flex items-center gap-3 px-5 py-3 rounded-2xl",
              matiaMode
                ? "bg-white text-[#E8007D] shadow-xl shadow-[#E8007D]/20 ring-2 ring-[#E8007D]/30 ring-offset-2 ring-offset-background hover:shadow-2xl hover:shadow-[#E8007D]/30"
                : cn(
                    "bg-gradient-to-br from-primary via-primary/90 to-accent",
                    "text-primary-foreground",
                    "shadow-xl shadow-primary/30",
                    "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
                    isLoading && "animate-pulse shadow-2xl shadow-primary/50"
                  ),
              "transition-all duration-300 ease-out",
              "hover:scale-105 active:scale-95",
            )}
            aria-label="Asistente AI"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className={cn(
              "relative w-12 h-12 transition-transform duration-500",
              "group-hover:scale-110 group-hover:rotate-3"
            )}>
              <div className={cn("absolute inset-0 rounded-full blur-sm", matiaMode ? "bg-[#E8007D]/20" : "bg-white/20")} />
              <img src={rabbitIcon} alt="AI Assistant" className="relative w-full h-full object-contain drop-shadow-lg" />
              {isLoading && (
                <div className={cn("absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md", matiaMode ? "bg-[#E8007D]" : "bg-white")}>
                  <Loader2 size={12} className={matiaMode ? "text-white animate-spin" : "text-primary animate-spin"} />
                </div>
              )}
            </div>
            <div className="relative flex flex-col items-start">
              <span className="text-base font-bold leading-tight tracking-tight">AI Erbi</span>
              <span className="text-xs opacity-80 leading-tight font-medium">Asistente inteligente</span>
            </div>
            <div className={cn("absolute inset-0 rounded-2xl animate-ping pointer-events-none", matiaMode ? "bg-[#E8007D]/10" : "bg-primary/10")} style={{ animationDuration: '3s' }} />
          </button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col h-[100dvh] sm:h-full w-full sm:max-w-lg p-5 overflow-hidden">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-3">
            <img src={rabbitIcon} alt="AI Erbi" className="w-10 h-10" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">AI Erbi</span>
                <Badge variant="secondary" className="text-[10px] py-0 h-4">Solo lectura</Badge>
              </div>
              <p className="text-xs font-normal text-muted-foreground">Asistente ERBI</p>
            </div>
            {messages.length > 0 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 px-2" title="Exportar">
                  <FileText size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-muted-foreground hover:text-destructive" title="Borrar">
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Quick actions when empty */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                className="h-auto py-2.5 px-3 text-left justify-start"
                onClick={() => sendQuery(a.query)}
                disabled={isLoading}
              >
                <a.icon className="h-4 w-4 mr-2 shrink-0 text-primary" />
                <span className="text-xs">{a.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-2 [scrollbar-width:thin]">
          <div className="space-y-3 py-2">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <img src={rabbitIcon} alt="" className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Pregúntame sobre rutas, incidencias, resúmenes...</p>
                <p className="text-xs mt-1 text-muted-foreground/70">
                  "Resumen del día" · "¿Quiénes han faltado?" · "Incidencias abiertas"
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Card className={cn(
                  "max-w-[90%] p-3 shadow-sm",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <div className={cn(msg.content.length > 500 && "max-h-[45vh] overflow-y-auto pr-2 [scrollbar-width:thin]")}>
                    {msg.role === "assistant" ? (
                      <div className="erbi-report prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-secondary font-bold underline underline-offset-2 decoration-2 decoration-secondary/60 hover:decoration-secondary bg-secondary/10 px-1 py-0.5 rounded transition-colors hover:bg-secondary/20 break-all"
                              >
                                {children || href}
                              </a>
                            ),
                          }}
                        >{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.source && msg.source !== "ninguna" && (
                      <Badge variant="outline" className="text-[9px] opacity-50 py-0 h-3.5">{msg.source}</Badge>
                    )}
                    {msg.role === "assistant" && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => handleSpeak(msg)}
                          className={cn(
                            "group/btn relative p-1.5 rounded-md transition-all",
                            (tts.isSpeaking || tts.isLoading) && speakingMsgId === msg.id
                              ? "text-destructive bg-destructive/15 hover:bg-destructive/25"
                              : "opacity-70 hover:opacity-100 hover:bg-muted"
                          )}
                          title={(tts.isSpeaking || tts.isLoading) && speakingMsgId === msg.id ? "Parar audio" : "🔊 Escuchar respuesta en voz alta"}
                        >
                          {tts.isLoading && speakingMsgId === msg.id ? (
                            <Loader2 size={18} className="animate-spin text-destructive" />
                          ) : tts.isSpeaking && speakingMsgId === msg.id ? (
                            <VolumeX size={18} className="text-destructive" />
                          ) : (
                            <Volume2 size={18} />
                          )}
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-foreground text-background px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                            {(tts.isSpeaking || tts.isLoading) && speakingMsgId === msg.id ? "Parar audio" : "Escuchar"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleShareMessage(msg)}
                          className="group/btn relative p-1.5 rounded-md hover:bg-muted transition-all opacity-70 hover:opacity-100"
                          title="📋 Copiar o compartir esta respuesta"
                        >
                          {copiedId === msg.id ? (
                            <Check size={18} className="text-secondary" />
                          ) : (
                            <Share2 size={18} />
                          )}
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-foreground text-background px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                            {copiedId === msg.id ? "¡Copiado!" : "Compartir"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <Card className="p-3 bg-muted shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">🧠 Pensando...</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions in conversation */}
        {messages.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1 items-center">
            <Button variant="outline" size="sm" className="whitespace-nowrap text-xs shrink-0 h-7 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1"
              onClick={handleClear} disabled={isLoading}>
              <Trash2 className="h-3 w-3" />
              Borrar chat
            </Button>
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.label} variant="ghost" size="sm" className="whitespace-nowrap text-xs shrink-0 h-7"
                onClick={() => sendQuery(a.query)} disabled={isLoading}>
                <a.icon className="h-3 w-3 mr-1" />
                {a.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="relative flex-1">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isListening ? "🎤 Escuchando..." : "Pregúntame algo..."}
              disabled={isLoading || isListening}
              className={cn(
                "h-14 pr-9 text-base border-[3px] border-black rounded-xl placeholder:font-semibold placeholder:text-muted-foreground/70",
                isListening && "border-destructive bg-destructive/5 animate-pulse placeholder:text-destructive"
              )}
            />
            {textInput.trim() && !isLoading && !isListening && (
              <button
                type="button"
                onClick={() => setTextInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Borrar texto"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {recognition.isSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "secondary"}
              onClick={handleMicToggle}
              disabled={isLoading}
              className={cn(
                "h-11 w-11 shrink-0 transition-all duration-200",
                isListening && "ring-2 ring-destructive ring-offset-2 animate-pulse",
                !isListening && "hover:bg-primary hover:text-primary-foreground"
              )}
              title={isListening ? "Parar" : "Hablar"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          )}
          <Button type="submit" size="icon" disabled={!textInput.trim() || isLoading || isListening}
            className="h-11 w-11 shrink-0">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </form>

        {recognition.error && (
          <p className="text-xs text-destructive text-center mt-1">{recognition.error}</p>
        )}
        {isListening && (
          <p className="text-xs text-destructive text-center mt-1 animate-pulse font-medium">
            🎤 Hablando... pulsa de nuevo para enviar
          </p>
        )}

        {/* Accesos directos */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            className="h-11 gap-2 text-xs font-semibold rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
            onClick={() => {
              setIsOpen(false);
              setTimeout(() => window.dispatchEvent(new CustomEvent('erbi:open-users')), 150);
            }}
          >
            <span className="text-base">👥</span>
            Usuarios
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2 text-xs font-semibold rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
            onClick={() => {
              setIsOpen(false);
              setTimeout(() => window.dispatchEvent(new CustomEvent('erbi:open-stats')), 150);
            }}
          >
            <span className="text-base">📊</span>
            Estadísticas
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2 text-xs font-semibold rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
            onClick={() => {
              setIsOpen(false);
              setTimeout(() => window.dispatchEvent(new CustomEvent('erbi:open-calendar')), 150);
            }}
          >
            <span className="text-base">📅</span>
            Historial
          </Button>
          <Button
            variant="outline"
            className="h-11 gap-2 text-xs font-semibold rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
            onClick={() => {
              setIsOpen(false);
              setTimeout(() => window.dispatchEvent(new CustomEvent('erbi:open-excel')), 150);
            }}
          >
            <span className="text-base">📄</span>
            Informe
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
