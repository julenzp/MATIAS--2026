import { AlertTriangle, Info } from 'lucide-react';

type ImpactWarningProps = {
  severity: 'amber' | 'red';
  message: string;
  details?: string[];
  showMatiaWarning?: boolean;
};

export function ImpactWarning({ severity, message, details, showMatiaWarning = true }: ImpactWarningProps) {
  const isRed = severity === 'red';

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
          isRed
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300'
        }`}
      >
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>{message}</p>
          {details && details.length > 0 && (
            <ul className="list-disc pl-4 text-xs space-y-0.5 mt-1">
              {details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showMatiaWarning && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Info size={14} className="shrink-0" />
          Este cambio se reflejará automáticamente en MATIA Portal.
        </div>
      )}
    </div>
  );
}
