import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DigitalClockProps {
  variant?: "morning" | "afternoon";
}

export const DigitalClock = ({ variant = "morning" }: DigitalClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const bgClass = variant === "morning" 
    ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20" 
    : "bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary/20";

  const textClass = variant === "morning"
    ? "text-primary"
    : "text-secondary";

  return (
    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border ${bgClass}`}>
      <Clock size={18} className={textClass} />
      <div className="flex items-center gap-0.5 font-mono">
        <span className={`text-2xl font-bold ${textClass}`}>{hours}</span>
        <span className={`text-2xl font-bold ${textClass} animate-pulse`}>:</span>
        <span className={`text-2xl font-bold ${textClass}`}>{minutes}</span>
        <span className={`text-base font-medium text-muted-foreground ml-0.5`}>:{seconds}</span>
      </div>
    </div>
  );
};
