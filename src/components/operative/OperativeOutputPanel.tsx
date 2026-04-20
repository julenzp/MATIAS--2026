import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OperativeReportButton } from './OperativeReportButton';
import { CopyFormattedButton } from './CopyFormattedButton';
import { BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './OperativeChat';

interface OperativeOutputPanelProps {
  lastResponse?: ChatMessage | null;
}

export function OperativeOutputPanel({ lastResponse }: OperativeOutputPanelProps) {
  const hasContent = !!lastResponse?.content;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Resultados</h3>
          {lastResponse?.intent && (
            <Badge variant="secondary" className="text-[10px] py-0 h-5">
              {lastResponse.intent}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasContent && <CopyFormattedButton content={lastResponse.content} />}
          <OperativeReportButton
            disabled={!hasContent}
            onGenerate={() => {
              if (lastResponse?.content) {
                navigator.clipboard.writeText(lastResponse.content);
              }
            }}
          />
        </div>
      </div>

      {/* Output area */}
      <Card className="flex-1 p-5 overflow-auto bg-card">
        {hasContent ? (
          <div className="erbi-report prose prose-sm max-w-none text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lastResponse.content}</ReactMarkdown>
            {lastResponse.source && lastResponse.source !== 'error' && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  📊 Fuente: {lastResponse.source}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  🕐 {new Date(lastResponse.timestamp).toLocaleString('es-ES')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Sin resultados todavía</p>
            <p className="text-xs mt-1">Escribe una consulta para ver datos aquí</p>
          </div>
        )}
      </Card>
    </div>
  );
}
