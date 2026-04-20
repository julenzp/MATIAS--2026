import { useCallback, useEffect, useRef, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_SUPABASE_URL;
const BACKEND_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type RecorderRefs = {
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: BlobPart[];
};

export function useElevenLabsTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const refs = useRef<RecorderRefs>({ mediaRecorder: null, stream: null, chunks: [] });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop everything on unmount
      try {
        refs.current.mediaRecorder?.stop();
      } catch {
        // ignore
      }
      refs.current.stream?.getTracks().forEach((t) => t.stop());
      refs.current.stream = null;
      refs.current.mediaRecorder = null;
      refs.current.chunks = [];
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];

    const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t));

    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    refs.current.stream = stream;
    refs.current.mediaRecorder = mediaRecorder;
    refs.current.chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) refs.current.chunks.push(e.data);
    };

    mediaRecorder.start(250);
    setIsRecording(true);
  }, [isRecording]);

  const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
    if (!refs.current.mediaRecorder || !isRecording) return "";

    setIsTranscribing(true);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const recorder = refs.current.mediaRecorder!;

        recorder.onstop = () => {
          const type = recorder.mimeType || "audio/webm";
          resolve(new Blob(refs.current.chunks, { type }));
        };

        recorder.onerror = () => reject(new Error("Error al grabar el audio"));

        try {
          recorder.stop();
        } catch (e) {
          reject(e);
        }
      });

      // Stop mic
      refs.current.stream?.getTracks().forEach((t) => t.stop());
      refs.current.stream = null;
      refs.current.mediaRecorder = null;
      refs.current.chunks = [];
      if (mountedRef.current) setIsRecording(false);

      if (blob.size < 1000) return "";

      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");

      const res = await fetch(`${BACKEND_URL}/functions/v1/elevenlabs-transcribe`, {
        method: "POST",
        headers: {
          apikey: BACKEND_ANON_KEY,
          Authorization: `Bearer ${BACKEND_ANON_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Error al transcribir el audio");
      }

      const data = await res.json();
      return (data?.text || "").trim();
    } finally {
      if (mountedRef.current) setIsTranscribing(false);
    }
  }, [isRecording]);

  const stop = useCallback(() => {
    try {
      refs.current.mediaRecorder?.stop();
    } catch {
      // ignore
    }
    refs.current.stream?.getTracks().forEach((t) => t.stop());
    refs.current.stream = null;
    refs.current.mediaRecorder = null;
    refs.current.chunks = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecordingAndTranscribe,
    stop,
  };
}
