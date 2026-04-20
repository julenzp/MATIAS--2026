import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Truncate text for TTS — no one wants to listen to 2 minutes of data.
 * Keep first ~400 chars, cut at sentence boundary.
 */
function truncateForSpeech(text: string, maxChars = 2000): string {
  // Strip markdown formatting
  const clean = text
    .replace(/[#*_`~\[\]()>|]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (clean.length <= maxChars) return clean;

  // Cut at last sentence boundary before maxChars
  const truncated = clean.substring(0, maxChars);
  const lastSentence = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('! '),
  );

  const cutPoint = lastSentence > maxChars * 0.5 ? lastSentence + 1 : maxChars;
  return clean.substring(0, cutPoint).trim();
}

export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any currently playing audio
    stop();

    const speechText = truncateForSpeech(text);
    console.log('[TTS] Sending', speechText.length, 'chars (original:', text.length, ')');

    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text: speechText }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error generating speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        toast.error("Error reproduciendo audio");
      };

      await audio.play();
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('[TTS] Error:', error);
      toast.error("Error generando voz");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    // Abort in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
    setIsLoading(false);
  }, []);

  return { speak, stop, isLoading, isSpeaking };
};