/**
 * useAlertSound – Sistema de audio a prueba de balas para alertas de bus.
 *
 * Diseñado para usuarios mayores que NO entienden de tecnología.
 * 
 * Estrategia:
 *   PRIMARIO:  HTML <audio> element con WAV generado en memoria
 *   FALLBACK:  Web Audio API oscillator
 *   EXTRA:     navigator.vibrate (solo Android, ignorado en iOS)
 *
 * El desbloqueo se persiste en localStorage para no volver a pedir.
 * Si la página se abre desde una notificación push, eso cuenta como gesto.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { getAlertSoundUrl } from "@/lib/generateAlertAudio";

const LS_KEY = "erbi:audio_unlocked";
const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

function getPersistedUnlock(): boolean {
  try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
}
function persistUnlock() {
  try { localStorage.setItem(LS_KEY, "1"); } catch { /* noop */ }
}

export function useAlertSound() {
  const [isUnlocked, setIsUnlocked] = useState(getPersistedUnlock);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // Pre-create audio element
  useEffect(() => {
    try {
      const audio = new Audio(getAlertSoundUrl());
      audio.preload = "auto";
      audio.volume = 1.0;
      audio.setAttribute("playsinline", "true");
      // iOS needs the element to exist in advance
      audioRef.current = audio;
    } catch (e) {
      console.warn("[AlertSound] Could not create Audio element:", e);
    }
  }, []);

  // If previously unlocked (localStorage), try to auto-play on first render
  // This works when opening from a push notification (counts as user gesture)
  useEffect(() => {
    if (getPersistedUnlock() && audioRef.current) {
      // Attempt a silent play to re-activate the audio pipeline
      const audio = audioRef.current;
      audio.volume = 0.01;
      audio.currentTime = 0;
      const p = audio.play();
      if (p) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1.0;
          setIsUnlocked(true);
        }).catch(() => {
          // Not from a gesture context — user will need to tap again
          // Don't clear localStorage though, it'll work next time from push
        });
      }
    }
  }, []);

  /**
   * MUST be called from a direct onClick/onTouchStart.
   * Unlocks audio, plays the full sound, persists to localStorage.
   */
  const unlockAndPlay = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(getAlertSoundUrl());
        audioRef.current.preload = "auto";
        audioRef.current.volume = 1.0;
      }

      const audio = audioRef.current;
      audio.volume = 1.0;
      audio.currentTime = 0;
      isPlayingRef.current = true;

      await audio.play();
      audio.onended = () => { isPlayingRef.current = false; };

      // Vibrate on Android only
      if (!isIOS && navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 800]);
      }

      setIsUnlocked(true);
      persistUnlock();
      return true;
    } catch (e) {
      isPlayingRef.current = false;
      console.warn("[AlertSound] unlockAndPlay failed:", e);

      // Try oscillator fallback
      const ok = await playOscillatorFallback();
      if (ok) {
        setIsUnlocked(true);
        persistUnlock();
      }
      return ok;
    }
  }, []);

  /**
   * Plays the alert sound. Works without a gesture ONLY if
   * unlockAndPlay() was called at least once before.
   */
  const play = useCallback(async (): Promise<boolean> => {
    if (isPlayingRef.current) return true;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(getAlertSoundUrl());
        audioRef.current.preload = "auto";
        audioRef.current.volume = 1.0;
      }

      const audio = audioRef.current;
      audio.volume = 1.0;
      audio.currentTime = 0;
      isPlayingRef.current = true;

      await audio.play();
      audio.onended = () => { isPlayingRef.current = false; };

      if (!isIOS && navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 800]);
      }

      setIsUnlocked(true);
      persistUnlock();
      return true;
    } catch (e) {
      isPlayingRef.current = false;
      console.warn("[AlertSound] play failed, trying oscillator fallback:", e);
      return playOscillatorFallback();
    }
  }, []);

  return { isUnlocked, unlockAndPlay, play };
}

// ── Fallback: Web Audio API oscillator ──────────────────────────────────────

async function playOscillatorFallback(): Promise<boolean> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;

    const playTone = (freq: number, startTime: number, dur = 0.5, vol = 0.8) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, startTime);
      osc.type = "sine";
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    const t = ctx.currentTime;
    // Same ding-dong pattern
    playTone(932, t, 0.6, 0.8);
    playTone(698, t + 0.35, 0.6, 0.75);
    playTone(932, t + 1.1, 0.6, 0.9);
    playTone(698, t + 1.45, 0.6, 0.85);
    playTone(1175, t + 2.3, 0.8, 1.0);

    if (!isIOS && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 800]);
    }

    return true;
  } catch {
    return false;
  }
}
