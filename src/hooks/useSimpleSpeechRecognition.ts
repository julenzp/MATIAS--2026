import { useState, useCallback, useRef } from "react";

/**
 * Simple speech recognition hook with continuous listening.
 * Keeps listening until user explicitly stops.
 */
export const useSimpleSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setError("Micrófono no disponible en este navegador.");
      return;
    }

    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";

    if (recognitionRef.current) {
      try { recognitionRef.current.abort?.(); } catch {}
      recognitionRef.current = null;
    }

    try {
      console.debug("[STT] starting SpeechRecognition (continuous)");

      const recognition = new SpeechRecognition();
      recognition.continuous = true;        // ← Keep listening until stopped
      recognition.interimResults = true;
      recognition.lang = "es-ES";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalParts = "";
        let interim = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalParts += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }

        if (finalParts) {
          finalTranscriptRef.current = finalParts.trim();
        }

        const combined = (finalTranscriptRef.current + " " + interim).trim();
        setTranscript(combined);
      };

      recognition.onerror = (event: any) => {
        const code = event?.error;
        console.debug("[STT] error", code);

        // "no-speech" is common with continuous mode; just restart
        if (code === "no-speech") {
          // Don't show error, silently continue
          return;
        }
        if (code === "not-allowed") {
          setError("Permiso de micrófono denegado. Revisa los permisos del navegador.");
        } else if (code && code !== "aborted") {
          setError(`Error de voz: ${code}`);
        }
        setIsListening(false);
      };

      // Auto-restart on unexpected end (network hiccup, silence timeout)
      recognition.onend = () => {
        console.debug("[STT] onend, isListening ref check");
        // If we're still supposed to be listening, restart
        if (recognitionRef.current === recognition) {
          try {
            recognition.start();
            console.debug("[STT] auto-restarted");
          } catch {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("Error starting SpeechRecognition:", err);
      setError("No pude iniciar el reconocimiento de voz.");
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    // Clear ref BEFORE stopping so onend doesn't auto-restart
    recognitionRef.current = null;
    
    if (rec) {
      try { rec.stop(); } catch {}
    }
    setIsListening(false);

    const result = transcript || finalTranscriptRef.current;
    console.log("📋 Final result:", result);
    return result;
  }, [transcript]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
};
