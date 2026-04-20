import { useState, useCallback, useRef, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type TTSState = 'idle' | 'generating' | 'ready' | 'playing' | 'error';

interface TTSMetrics {
  generationStartTime: number | null;
  generationEndTime: number | null;
  generationDurationMs: number | null;
  playbackStartTime: number | null;
}

interface UseTTSMessageReturn {
  state: TTSState;
  audioUrl: string | null;
  error: string | null;
  metrics: TTSMetrics;
  generateAudio: (text: string) => Promise<void>;
  play: () => Promise<void>;
  stop: () => void;
  retry: () => void;
}

// Global audio instance to ensure only one plays at a time
let globalAudioInstance: HTMLAudioElement | null = null;
let globalStopCallback: (() => void) | null = null;

export const useTTSMessage = (): UseTTSMessageReturn => {
  const [state, setState] = useState<TTSState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TTSMetrics>({
    generationStartTime: null,
    generationEndTime: null,
    generationDurationMs: null,
    playbackStartTime: null,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTextRef = useRef<string>("");
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const stopGlobalAudio = useCallback(() => {
    if (globalAudioInstance) {
      globalAudioInstance.pause();
      globalAudioInstance.currentTime = 0;
      if (globalStopCallback) {
        globalStopCallback();
      }
    }
  }, []);

  const generateAudio = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.log('[TTS-Message] Empty text, skipping generation');
      return;
    }

    // Store text for retry
    lastTextRef.current = text;
    
    // Clear previous audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    setError(null);
    setState('generating');
    
    const startTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      generationStartTime: startTime,
      generationEndTime: null,
      generationDurationMs: null,
    }));
    
    console.log('[TTS-Message] Starting audio generation for:', text.substring(0, 50) + '...');

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
          body: JSON.stringify({ text }),
        }
      );

      if (!isMountedRef.current) return;

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      
      console.log(`[TTS-Message] Response status: ${response.status}, duration: ${durationMs}ms`);

      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use default error message
        }
        
        console.error('[TTS-Message] API error:', errorMessage);
        setError(errorMessage);
        setState('error');
        setMetrics(prev => ({
          ...prev,
          generationEndTime: endTime,
          generationDurationMs: durationMs,
        }));
        return;
      }

      const audioBlob = await response.blob();
      
      if (!isMountedRef.current) return;
      
      console.log(`[TTS-Message] Audio blob received: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      if (audioBlob.size < 100) {
        console.error('[TTS-Message] Audio blob too small, likely invalid');
        setError('Audio generado inválido');
        setState('error');
        return;
      }

      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setState('ready');
      
      setMetrics(prev => ({
        ...prev,
        generationEndTime: endTime,
        generationDurationMs: durationMs,
      }));
      
      console.log(`[TTS-Message] Audio ready in ${durationMs}ms`);
      
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      
      const errorMessage = err instanceof Error ? err.message : 'Error de red';
      console.error('[TTS-Message] Generation error:', errorMessage, `after ${durationMs}ms`);
      
      setError(errorMessage);
      setState('error');
      setMetrics(prev => ({
        ...prev,
        generationEndTime: endTime,
        generationDurationMs: durationMs,
      }));
    }
  }, [audioUrl]);

  const play = useCallback(async () => {
    if (!audioUrl) {
      console.warn('[TTS-Message] No audio URL to play');
      return;
    }

    // Stop any currently playing audio globally
    stopGlobalAudio();

    console.log('[TTS-Message] Starting playback');
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    globalAudioInstance = audio;
    
    const handleStop = () => {
      if (isMountedRef.current) {
        setState('ready');
      }
    };
    globalStopCallback = handleStop;

    setMetrics(prev => ({
      ...prev,
      playbackStartTime: performance.now(),
    }));

    audio.onplay = () => {
      console.log('[TTS-Message] Audio playing');
      if (isMountedRef.current) {
        setState('playing');
      }
    };

    audio.onended = () => {
      console.log('[TTS-Message] Audio ended');
      if (isMountedRef.current) {
        setState('ready');
      }
      if (globalAudioInstance === audio) {
        globalAudioInstance = null;
        globalStopCallback = null;
      }
    };

    audio.onerror = (e) => {
      console.error('[TTS-Message] Playback error:', e);
      if (isMountedRef.current) {
        setError('Error al reproducir audio');
        setState('error');
      }
      if (globalAudioInstance === audio) {
        globalAudioInstance = null;
        globalStopCallback = null;
      }
    };

    try {
      await audio.play();
    } catch (err) {
      console.error('[TTS-Message] Play failed:', err);
      if (isMountedRef.current) {
        setError('No se pudo reproducir el audio');
        setState('error');
      }
    }
  }, [audioUrl, stopGlobalAudio]);

  const stop = useCallback(() => {
    console.log('[TTS-Message] Stopping playback');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (globalAudioInstance === audioRef.current) {
      globalAudioInstance = null;
      globalStopCallback = null;
    }
    setState(audioUrl ? 'ready' : 'idle');
  }, [audioUrl]);

  const retry = useCallback(() => {
    console.log('[TTS-Message] Retrying generation');
    if (lastTextRef.current) {
      generateAudio(lastTextRef.current);
    }
  }, [generateAudio]);

  return {
    state,
    audioUrl,
    error,
    metrics,
    generateAudio,
    play,
    stop,
    retry,
  };
};
