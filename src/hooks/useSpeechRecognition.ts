import { useState, useCallback, useRef, useEffect } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioDetected, setAudioDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const shouldRestartRef = useRef(false);
  const isMountedRef = useRef(true);
  const noSpeechCountRef = useRef(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const speechStartedRef = useRef(false);
  const speechStartTimeoutRef = useRef<number | null>(null);

  const SPEECH_START_TIMEOUT_MS = 12000;
  const AUDIO_ACTIVE_THRESHOLD = 0.02;

  const stopAudioMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (isMountedRef.current) {
      setAudioLevel(0);
      setAudioDetected(false);
    }
  }, []);

  const startAudioMeter = useCallback((stream: MediaStream) => {
    const AudioContextCtor =
      window.AudioContext || ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext as typeof AudioContext | undefined);

    if (!AudioContextCtor) return;

    // (Safari) audio context should start from a user gesture.
    const ctx = new AudioContextCtor();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !isMountedRef.current) return;

      analyserRef.current.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const normalized = Math.min(1, rms * 4);

      setAudioLevel(normalized);
      setAudioDetected(normalized > AUDIO_ACTIVE_THRESHOLD);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Request microphone permission (+ keep stream for audio level meter)
  const requestPermission = useCallback(async () => {
    try {
      console.log("Requesting microphone permission...");

      if (micStreamRef.current) {
        setHasPermission(true);
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Microphone permission granted");
      micStreamRef.current = stream;
      setHasPermission(true);

      // Start audio level meter
      startAudioMeter(stream);

      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setHasPermission(false);
      setErrorMessage(
        "Permiso de micrófono denegado. Actívalo en el navegador e inténtalo de nuevo."
      );
      stopAudioMeter();
      return false;
    }
  }, [startAudioMeter, stopAudioMeter]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onaudiostart = () => {
        console.log('Audio capture started');
        if (isMountedRef.current) {
          setTimeout(() => setAudioDetected(true), 0);
        }
      };

      recognition.onsoundstart = () => {
        console.log('Sound detected');
      };

       recognition.onspeechstart = () => {
         console.log('Speech detected');
         noSpeechCountRef.current = 0;
         speechStartedRef.current = true;
         setErrorMessage(null);

         if (speechStartTimeoutRef.current) {
           clearTimeout(speechStartTimeoutRef.current);
           speechStartTimeoutRef.current = null;
         }
       };

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        
        noSpeechCountRef.current = 0;
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current = finalTranscript.trim();
        }

        const combined = (finalTranscriptRef.current + ' ' + interimTranscript).trim();
        console.log('Transcript:', combined);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setTranscript(combined);
          }
        }, 0);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setTimeout(() => {
            if (isMountedRef.current) {
              setHasPermission(false);
              setIsListening(false);
              shouldRestartRef.current = false;
            }
          }, 0);
          return;
        }
        
         if (event.error === 'no-speech') {
           noSpeechCountRef.current++;
           console.log('No speech count:', noSpeechCountRef.current);

           // NOTE: Don't call recognition.start() here (causes InvalidStateError on some browsers).
           // We'll let onend handle restart if needed.
           if (noSpeechCountRef.current >= 2) {
             setErrorMessage(
               'No detecté voz. Revisa que el micrófono de tu Mac esté seleccionado y que no esté en silencio.'
             );
           }

           return;
         }
        
        if (event.error === 'aborted') return;
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsListening(false);
            shouldRestartRef.current = false;
          }
        }, 0);
      };

       recognition.onend = () => {
         console.log('Recognition ended, shouldRestart:', shouldRestartRef.current);

         if (speechStartTimeoutRef.current) {
           clearTimeout(speechStartTimeoutRef.current);
           speechStartTimeoutRef.current = null;
         }

         // If we are still in "listening" mode, try to restart.
         if (shouldRestartRef.current && isMountedRef.current) {
           setTimeout(() => {
             if (!shouldRestartRef.current || !isMountedRef.current) return;
             try {
               console.log('Restarting recognition...');
               recognition.start();
             } catch (e) {
               console.log('Could not restart:', e);
               setIsListening(false);
               shouldRestartRef.current = false;
             }
           }, 250);
         } else {
           setTimeout(() => {
             if (isMountedRef.current) {
               setIsListening(false);
               setAudioDetected(false);
               setAudioLevel(0);
               speechStartedRef.current = false;
               setErrorMessage(null);
             }
           }, 0);
         }
       };

      recognitionRef.current = recognition;
    }

     return () => {
       isMountedRef.current = false;
       shouldRestartRef.current = false;

       if (speechStartTimeoutRef.current) {
         clearTimeout(speechStartTimeoutRef.current);
         speechStartTimeoutRef.current = null;
       }

       if (recognitionRef.current) {
         try {
           recognitionRef.current.abort();
         } catch (e) {
           // Ignore
         }
       }

       stopAudioMeter();
     };
  }, []);

   const startListening = useCallback(async () => {
     if (!recognitionRef.current) return;

     setErrorMessage(null);

     // Request permission first if not granted
     if (hasPermission !== true) {
       const granted = await requestPermission();
       if (!granted) {
         console.error('Cannot start: no microphone permission');
         return;
       }
     }

     if (!isListening) {
       console.log('Starting speech recognition...');
       setTranscript('');
       finalTranscriptRef.current = '';
       shouldRestartRef.current = true;
       noSpeechCountRef.current = 0;
       speechStartedRef.current = false;

       if (speechStartTimeoutRef.current) {
         clearTimeout(speechStartTimeoutRef.current);
       }

       // Give users more time to start speaking (Macs often need a bit longer)
       speechStartTimeoutRef.current = window.setTimeout(() => {
         if (!isMountedRef.current || !shouldRestartRef.current) return;
         if (!speechStartedRef.current) {
           setErrorMessage(
             'No detecto voz todavía. Prueba a hablar más cerca del micrófono o revisa la entrada de audio en tu navegador.'
           );
         }
       }, SPEECH_START_TIMEOUT_MS);

       try {
         recognitionRef.current.start();
         setIsListening(true);
       } catch (e: any) {
         console.error('Error starting recognition:', e);

         // Some browsers throw if start() is called too fast.
         if (e?.name === 'InvalidStateError') {
           try {
             recognitionRef.current.abort();
           } catch {
             // ignore
           }

           setTimeout(() => {
             try {
               if (shouldRestartRef.current && isMountedRef.current) {
                 recognitionRef.current?.start();
                 setIsListening(true);
               }
             } catch (err) {
               console.error('Error re-starting recognition:', err);
               setIsListening(false);
               shouldRestartRef.current = false;
             }
           }, 300);
         }
       }
     }
   }, [SPEECH_START_TIMEOUT_MS, hasPermission, isListening, requestPermission]);

   const stopListening = useCallback((): string => {
     console.log('Stopping speech recognition...');
     shouldRestartRef.current = false;

     if (speechStartTimeoutRef.current) {
       clearTimeout(speechStartTimeoutRef.current);
       speechStartTimeoutRef.current = null;
     }

     if (recognitionRef.current) {
       try {
         recognitionRef.current.stop();
       } catch (e) {
         // Ignore
       }
     }

     setIsListening(false);
     setAudioDetected(false);
     setAudioLevel(0);

     stopAudioMeter();

     const result = transcript || finalTranscriptRef.current;
     console.log('Final transcript:', result);
     return result;
   }, [stopAudioMeter, transcript]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
  }, []);

   return {
     isListening,
     transcript,
     isSupported,
     hasPermission,
     audioDetected,
     audioLevel,
     errorMessage,
     startListening,
     stopListening,
     resetTranscript,
     requestPermission,
   };
};
