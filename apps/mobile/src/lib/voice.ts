import { Platform } from "react-native";

export type VoiceClip = {
  audio: string;
  mime: string;
  durationMs: number;
};

type Recorder = {
  stop: () => Promise<VoiceClip>;
};

export function canRecordVoice(): boolean {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export async function startVoiceRecording(): Promise<Recorder> {
  if (!canRecordVoice()) {
    throw new Error("unavailable");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const started = Date.now();
  rec.start();

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        rec.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunks, { type: mime });
          blob
            .arrayBuffer()
            .then((buffer) => {
              const bytes = new Uint8Array(buffer);
              let binary = "";
              for (let i = 0; i < bytes.length; i += 0x8000) {
                binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
              }
              resolve({
                audio: btoa(binary),
                mime,
                durationMs: Date.now() - started,
              });
            })
            .catch(reject);
        };
        rec.onerror = () => reject(new Error("record_failed"));
        rec.stop();
      }),
  };
}

let playing: HTMLAudioElement | null = null;

export async function playVoiceUrl(url: string, onEnded?: () => void): Promise<void> {
  if (Platform.OS !== "web") return;
  playing?.pause();
  const audio = new Audio(url);
  playing = audio;
  audio.onended = () => {
    if (playing === audio) playing = null;
    onEnded?.();
  };
  await audio.play();
}

export function stopVoicePlayback(): void {
  playing?.pause();
  playing = null;
}
