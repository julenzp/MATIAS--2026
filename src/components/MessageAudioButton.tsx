import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, RotateCcw, Volume2 } from "lucide-react";
import { useTTSMessage, TTSState } from "@/hooks/useTTSMessage";
import { cn } from "@/lib/utils";

interface MessageAudioButtonProps {
  text: string;
  autoGenerate?: boolean;
  className?: string;
}

export const MessageAudioButton = ({ 
  text, 
  autoGenerate = true,
  className 
}: MessageAudioButtonProps) => {
  const { state, error, metrics, generateAudio, play, stop, retry } = useTTSMessage();

  // Auto-generate audio in background when text is provided
  useEffect(() => {
    if (autoGenerate && text) {
      generateAudio(text);
    }
  }, [text, autoGenerate, generateAudio]);

  const handleClick = () => {
    switch (state) {
      case 'idle':
        // If not auto-generating, start generation on first click
        generateAudio(text);
        break;
      case 'generating':
        // Do nothing while generating
        break;
      case 'ready':
        play();
        break;
      case 'playing':
        stop();
        break;
      case 'error':
        retry();
        break;
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <Volume2 size={14} />
            <span>Audio</span>
          </>
        );
      case 'generating':
        return (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Generando...</span>
          </>
        );
      case 'ready':
        return (
          <>
            <Play size={14} />
            <span>Play</span>
          </>
        );
      case 'playing':
        return (
          <>
            <Square size={14} />
            <span>Detener</span>
          </>
        );
      case 'error':
        return (
          <>
            <RotateCcw size={14} />
            <span>Reintentar</span>
          </>
        );
    }
  };

  const getButtonVariant = (): "default" | "secondary" | "destructive" | "outline" | "ghost" => {
    switch (state) {
      case 'playing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const isDisabled = state === 'generating';

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={getButtonVariant()}
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "h-7 px-2 text-xs gap-1.5",
          state === 'generating' && "cursor-wait",
          state === 'playing' && "animate-pulse"
        )}
        title={
          state === 'error' && error 
            ? `Error: ${error}. Click para reintentar.`
            : state === 'ready' 
            ? 'Reproducir audio' 
            : undefined
        }
      >
        {getButtonContent()}
      </Button>
      
      {/* Debug info in development */}
      {import.meta.env.DEV && metrics.generationDurationMs !== null && (
        <span className="text-[10px] text-muted-foreground">
          {metrics.generationDurationMs}ms
        </span>
      )}
      
      {/* Error tooltip */}
      {state === 'error' && error && (
        <span className="text-[10px] text-destructive max-w-[150px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
};
