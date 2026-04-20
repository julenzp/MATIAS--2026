import { Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface LastUpdatedIndicatorProps {
  lastUpdated: Date | null;
}

export const LastUpdatedIndicator = ({ lastUpdated }: LastUpdatedIndicatorProps) => {
  const [displayText, setDisplayText] = useState<string>("");
  const [isRecent, setIsRecent] = useState(false);
  const { playSound } = useNotificationSound();
  const isFirstRender = useRef(true);
  const previousUpdateRef = useRef<Date | null>(null);

  // Play sound when lastUpdated changes (but not on first render)
  useEffect(() => {
    if (lastUpdated && !isFirstRender.current && previousUpdateRef.current !== lastUpdated) {
      playSound();
    }
    isFirstRender.current = false;
    previousUpdateRef.current = lastUpdated;
  }, [lastUpdated, playSound]);

  useEffect(() => {
    if (!lastUpdated) {
      setDisplayText("");
      setIsRecent(false);
      return;
    }

    const updateText = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastUpdated.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      // Animate pulse for first 5 seconds
      setIsRecent(diffSecs < 5);

      if (diffSecs < 10) {
        setDisplayText("Ahora");
      } else if (diffSecs < 60) {
        setDisplayText(`Hace ${diffSecs}s`);
      } else if (diffMins < 60) {
        setDisplayText(`Hace ${diffMins}min`);
      } else {
        setDisplayText(
          lastUpdated.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    };

    updateText();
    const interval = setInterval(updateText, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!lastUpdated || !displayText) {
    return null;
  }

  return (
    <div 
      className={`flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md transition-all duration-300 ${
        isRecent ? "animate-pulse ring-2 ring-green-500/50 bg-green-500/10" : ""
      }`}
    >
      <Clock 
        size={12} 
        className={`text-green-500 transition-transform duration-300 ${isRecent ? "scale-110" : ""}`} 
      />
      <span className={isRecent ? "text-green-600 font-medium" : ""}>{displayText}</span>
    </div>
  );
};
