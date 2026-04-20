import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { markdownToStyledHtml } from '@/lib/markdownToHtml';

interface CopyFormattedButtonProps {
  content: string;
}

/**
 * Copies the AI response as rich HTML so it pastes beautifully
 * into Word, Google Docs, PowerPoint, email, etc.
 */
export function CopyFormattedButton({ content }: CopyFormattedButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Build a styled HTML version for rich paste
      const html = markdownToStyledHtml(content);

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([content], { type: 'text/plain' }),
        }),
      ]);

      setCopied(true);
      toast({ title: '📋 Copiado con formato', description: 'Pega en Word, Docs o PowerPoint y se verá profesional.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to plain text
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: '📋 Copiado como texto' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-5 px-1.5 text-[10px] gap-1 opacity-60 hover:opacity-100"
      title="Copiar con formato profesional"
    >
      {copied ? <Check className="h-3 w-3 text-secondary" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
}
