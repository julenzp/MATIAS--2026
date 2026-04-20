import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface OperativeReportButtonProps {
  disabled?: boolean;
  onGenerate: () => void;
}

export function OperativeReportButton({ disabled, onGenerate }: OperativeReportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onGenerate}
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      Generar informe
    </Button>
  );
}
