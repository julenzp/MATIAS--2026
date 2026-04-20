import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';

type ConfirmStepProps = {
  onConfirm: (motivo: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  children: React.ReactNode; // impact warnings go here
};

export function ConfirmStep({ onConfirm, onCancel, saving, children }: ConfirmStepProps) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <h3 className="font-semibold text-sm">Paso 2: Revisión de impacto</h3>

      {children}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Motivo del cambio <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="Describe brevemente por qué se realiza esta modificación..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="min-h-[60px] text-sm"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="gap-1">
          <X size={14} />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(motivo)}
          disabled={saving || !motivo.trim()}
          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? 'Aplicando...' : (
            <>
              <Check size={14} />
              Confirmar cambio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
