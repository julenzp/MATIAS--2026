/**
 * generate-alert-audio.ts
 * 
 * Generates a VERY LOUD, urgent doorbell + siren-style alert tone as a WAV file.
 * Pattern: 5 ding-dong chimes + rising siren for maximum attention.
 * Duration ~8 seconds. Designed for elderly users who may have hearing difficulties.
 * 
 * The WAV is cached as a Blob URL singleton so it's only generated once.
 */

const SAMPLE_RATE = 44100;

function generateSample(t: number, freq: number): number {
  // Rich doorbell tone: fundamental + harmonics for a bell-like timbre
  const fundamental = Math.sin(2 * Math.PI * freq * t);
  const harmonic2 = 0.6 * Math.sin(2 * Math.PI * freq * 2 * t);
  const harmonic3 = 0.35 * Math.sin(2 * Math.PI * freq * 3 * t);
  const harmonic5 = 0.15 * Math.sin(2 * Math.PI * freq * 5.04 * t);
  return (fundamental + harmonic2 + harmonic3 + harmonic5) / 2.1;
}

function envelope(t: number, start: number, duration: number): number {
  const elapsed = t - start;
  if (elapsed < 0 || elapsed > duration) return 0;
  const attack = Math.min(1, elapsed / 0.003);
  const decay = Math.exp(-elapsed * 2.0); // Slower decay = rings longer
  return attack * decay;
}

interface ToneEvent {
  freq: number;
  start: number;
  duration: number;
  volume: number;
}

export function generateDoorbellWav(): Blob {
  const totalDuration = 4.0;
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);

  const tones: ToneEvent[] = [
    // 1st ding-dong
    { freq: 932, start: 0.0, duration: 0.8, volume: 0.9 },
    { freq: 698, start: 0.3, duration: 0.8, volume: 0.85 },
    
    // 2nd ding-dong (louder)
    { freq: 932, start: 1.0, duration: 0.8, volume: 0.95 },
    { freq: 698, start: 1.3, duration: 0.8, volume: 0.9 },

    // 3rd ding-dong (maximum)
    { freq: 932, start: 2.0, duration: 0.8, volume: 1.0 },
    { freq: 698, start: 2.3, duration: 0.8, volume: 0.95 },

    // Final high note
    { freq: 1175, start: 3.0, duration: 0.9, volume: 1.0 },
  ];

  const pcmData = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (const tone of tones) {
      const env = envelope(t, tone.start, tone.duration);
      if (env > 0.0001) {
        sample += generateSample(t, tone.freq) * env * tone.volume;
      }
    }
    pcmData[i] = Math.max(-1, Math.min(1, sample * 1.6));
  }

  // Encode as WAV (16-bit PCM mono)
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(44 + i * 2, Math.floor(s * 32767), true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Singleton cached URL
let _cachedUrl: string | null = null;

export function getAlertSoundUrl(): string {
  if (!_cachedUrl) {
    _cachedUrl = URL.createObjectURL(generateDoorbellWav());
  }
  return _cachedUrl;
}
