import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Mic, MicOff, Copy, Check } from 'lucide-react';
import { MessageAudioButton } from '@/components/MessageAudioButton';
import { useSimpleSpeechRecognition } from '@/hooks/useSimpleSpeechRecognition';
import { OperativeSuggestions } from './OperativeSuggestions';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyFormattedButton } from './CopyFormattedButton';
import { toast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
  intent?: string;
}

interface OperativeChatProps {
  onNewResponse?: (message: ChatMessage) => void;
}

export function OperativeChat({ onNewResponse }: OperativeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognition = useSimpleSpeechRecognition();
  const [isListening, setIsListening] = useState(false);

  // Sync transcript to input
  useEffect(() => {
    if (recognition.transcript) {
      setInput(recognition.transcript);
    }
  }, [recognition.transcript]);

  // Auto-send when recognition stops with text
  useEffect(() => {
    if (!recognition.isListening && isListening) {
      setIsListening(false);
      const text = recognition.transcript?.trim();
      if (text) {
        // Small delay to ensure state is updated
        setTimeout(() => handleSend(text), 200);
      }
    }
  }, [recognition.isListening]);

  const toggleVoice = useCallback(() => {
    if (recognition.isListening) {
      recognition.stopListening();
      setIsListening(false);
    } else {
      recognition.resetTranscript();
      recognition.startListening();
      setIsListening(true);
    }
  }, [recognition]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const isMatiaSession = !session && localStorage.getItem('erbi:matia_session') === 'true';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      };

      if (isMatiaSession) {
        headers['X-Matia-Session'] = 'true';
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erbi-ia-query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Error al consultar la IA');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Sin respuesta del sistema.',
        timestamp: data.timestamp || new Date().toISOString(),
        source: data.source || 'sistema',
        intent: data.intent,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onNewResponse?.(assistantMsg);
    } catch (err: any) {
      const errorMsg = err?.message || 'Error desconocido';
      toast({
        title: 'Error en la consulta',
        description: errorMsg,
        variant: 'destructive',
      });

      const errorAssistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        timestamp: new Date().toISOString(),
        source: 'error',
      };
      setMessages((prev) => [...prev, errorAssistant]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bot className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Asistente Operativo ERBI</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Consulta datos operativos, incidencias, puntualidad y genera informes.
            </p>
            <div className="mt-6 w-full max-w-md">
              <OperativeSuggestions onSelect={handleSend} disabled={isLoading} />
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
            <Card
              className={`max-w-[85%] p-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="erbi-report prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] opacity-50">
                  {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {msg.source && msg.source !== 'error' && (
                  <Badge variant="outline" className="text-[10px] opacity-60 py-0 h-4">
                    {msg.source}
                  </Badge>
                )}
                {msg.role === 'assistant' && msg.source !== 'error' && (
                  <>
                    <CopyFormattedButton content={msg.content} />
                    <MessageAudioButton text={msg.content} autoGenerate={false} />
                  </>
                )}
              </div>
            </Card>
            {msg.role === 'user' && (
              <div className="shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-secondary" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="shrink-0 mt-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
            <Card className="max-w-[85%] p-3 shadow-sm bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analizando datos...</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Compact suggestions when conversation started */}
      {messages.length > 0 && (
        <OperativeSuggestions onSelect={handleSend} compact disabled={isLoading} />
      )}

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={recognition.isListening ? "🎤 Escuchando..." : "Escribe tu consulta operativa..."}
          className={`flex-1 min-h-[44px] max-h-[120px] resize-none ${recognition.isListening ? 'border-red-400 bg-red-50/50' : ''}`}
          rows={1}
          disabled={isLoading}
        />
        {recognition.isSupported && (
          <Button
            onClick={toggleVoice}
            variant={recognition.isListening ? "destructive" : "outline"}
            size="icon"
            className="shrink-0 self-end h-[44px] w-[44px]"
            disabled={isLoading}
            title={recognition.isListening ? "Parar micrófono" : "Hablar"}
          >
            {recognition.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="shrink-0 self-end h-[44px] w-[44px]"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {recognition.error && (
        <p className="text-xs text-destructive mt-1">{recognition.error}</p>
      )}
    </div>
  );
}
