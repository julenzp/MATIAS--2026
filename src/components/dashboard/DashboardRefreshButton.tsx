import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  onRefresh: () => void;
  isRefetching?: boolean;
}

export function DashboardRefreshButton({ onRefresh, isRefetching }: Props) {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Actualizar</span>
    </Button>
  );
}
