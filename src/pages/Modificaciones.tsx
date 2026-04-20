import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { ModificacionesPanel } from '@/components/modificaciones/ModificacionesPanel';

export default function Modificaciones() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  useActivityLog("Panel Modificaciones");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground">Acceso restringido a administradores.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight">Panel de Modificaciones</h1>
            <p className="text-xs text-muted-foreground">Cambios validados con previsualización de impacto</p>
          </div>
        </div>

        <ModificacionesPanel />
      </div>
    </div>
  );
}
