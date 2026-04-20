import { useState } from 'react';
import { OperativeChat, type ChatMessage } from './OperativeChat';
import { OperativeOutputPanel } from './OperativeOutputPanel';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function OperativeAssistant() {
  const isMobile = useIsMobile();
  const [lastResponse, setLastResponse] = useState<ChatMessage | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground leading-tight">
            Asistente Operativo
          </h2>
          <p className="text-xs text-muted-foreground">Consultas y análisis en tiempo real</p>
        </div>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <ShieldCheck className="h-3 w-3" />
          Solo lectura
        </Badge>
      </div>

      {/* Content — two-column on desktop, tabs on mobile */}
      {isMobile ? (
        <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="chat">Conversación</TabsTrigger>
            <TabsTrigger value="output">Resultados</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 min-h-0">
            <OperativeChat onNewResponse={setLastResponse} />
          </TabsContent>
          <TabsContent value="output" className="flex-1 min-h-0">
            <OperativeOutputPanel lastResponse={lastResponse} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <OperativeChat onNewResponse={setLastResponse} />
          </div>
          <div className="flex flex-col min-h-0">
            <OperativeOutputPanel lastResponse={lastResponse} />
          </div>
        </div>
      )}
    </div>
  );
}
