import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, FileText, Calendar } from 'lucide-react';

const SUGGESTIONS = [
  { label: '¿Qué rutas están activas hoy?', icon: Clock },
  { label: '¿Qué incidencias siguen abiertas?', icon: AlertTriangle },
  { label: '¿Cuántos usuarios hay registrados?', icon: FileText },
  { label: 'Hazme un resumen del servicio de hoy', icon: Calendar },
];

interface OperativeSuggestionsProps {
  onSelect: (query: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function OperativeSuggestions({ onSelect, disabled, compact }: OperativeSuggestionsProps) {
  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s.label}
            variant="ghost"
            size="sm"
            className="whitespace-nowrap text-xs shrink-0 h-7"
            onClick={() => onSelect(s.label)}
            disabled={disabled}
          >
            <s.icon className="h-3 w-3 mr-1" />
            {s.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {SUGGESTIONS.map((s) => (
        <Button
          key={s.label}
          variant="outline"
          className="h-auto py-3 px-4 text-left justify-start gap-3"
          onClick={() => onSelect(s.label)}
          disabled={disabled}
        >
          <s.icon className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm leading-snug">{s.label}</span>
        </Button>
      ))}
    </div>
  );
}
