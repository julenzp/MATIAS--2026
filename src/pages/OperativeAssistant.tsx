import { useAuth } from '@/hooks/useAuth';
import { AIAssistantButton } from '@/components/AIAssistantButton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OperativeAssistantPage() {
  const { user, isAdmin, isMatia, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const canUseAssistant = isAdmin || isMatia;

  if (!canUseAssistant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Acceso restringido</h1>
        <p className="text-muted-foreground text-center">
          Esta sección está disponible únicamente para administradores y coordinación.
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>

        <div className="rounded-2xl border bg-card p-5 sm:p-6 flex flex-col items-center gap-3 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI Erbi</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Esta vista ya usa el nuevo visual de AI Erbi y abre el panel automáticamente.
          </p>
          <AIAssistantButton autoOpen />
        </div>
      </div>
    </div>
  );
}
