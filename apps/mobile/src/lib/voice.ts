import { Platform } from "react-native";
import { getToken } from "./auth-store";
import { API_URL } from "./config";

export type VoiceClip = {
  audio: string;
  mime: string;
  durationMs: number;
};

type Recorder = {
  stop: () => Promise<VoiceClip>;
};

type NativePlayer = {
  play: () => void;
  pause: () => void;
  remove: () => void;
  addListener: (
    event: "playbackStatusUpdate",
    listener: (status: { didJustFinish: boolean }) => void,
  ) => { remove: () => void };
};

let nativePlayer: NativePlayer | null = null;
let playing: HTMLAudioElement | null = null;

export function canRecordVoice(): boolean {
  if (Platform.OS === "ios" || Platform.OS === "android") return true;
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63];
    out += chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? chars[triple & 63] : "=";
  }
  return out;
}

function mimeForUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  return "audio/mp4";
}

export async function startVoiceRecording(): Promise<Recorder> {
  if (Platform.OS === "web") return startWebRecording();
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("unavailable");
  }
  return startNativeRecording();
}

async function startWebRecording(): Promise<Recorder> {
  if (!canRecordVoice()) throw new Error("unavailable");
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
              resolve({
                audio: bytesToBase64(new Uint8Array(buffer)),
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

async function startNativeRecording(): Promise<Recorder> {
  const audio = await import("expo-audio");
  const { default: AudioModule } = await import("expo-audio/build/AudioModule");
  const permission = await audio.requestRecordingPermissionsAsync();
  if (!permission.granted) throw new Error("unavailable");
  await audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const recorder = new AudioModule.AudioRecorder(audio.RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  const started = Date.now();
  recorder.record();

  return {
    stop: async () => {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("record_failed");
      const { File } = await import("expo-file-system");
      const buffer = await new File(uri).arrayBuffer();
      return {
        audio: bytesToBase64(new Uint8Array(buffer)),
        mime: mimeForUri(uri),
        durationMs: Date.now() - started,
      };
    },
  };
}

export async function playMessageAudio(
  threadId: string,
  messageId: string,
  onEnded?: () => void,
): Promise<void> {
  stopVoicePlayback();
  const token = await getToken();
  const url = `${API_URL}/threads/${threadId}/messages/${messageId}/audio`;
  if (Platform.OS === "web") {
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error("audio");
    const objectUrl = URL.createObjectURL(await res.blob());
    const element = new Audio(objectUrl);
    playing = element;
    element.onended = () => {
      if (playing === element) playing = null;
      URL.revokeObjectURL(objectUrl);
      onEnded?.();
    };
    await element.play();
    return;
  }

  const audio = await import("expo-audio");
  const { File, Paths } = await import("expo-file-system");
  const destination = new File(Paths.cache, `voice-${messageId}`);
  const file = await File.downloadFileAsync(url, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });
  await audio.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  const player = audio.createAudioPlayer(file.uri) as NativePlayer;
  nativePlayer = player;
  player.addListener("playbackStatusUpdate", (status) => {
    if (!status.didJustFinish) return;
    if (nativePlayer === player) nativePlayer = null;
    player.remove();
    onEnded?.();
  });
  player.play();
}

export function stopVoicePlayback(): void {
  playing?.pause();
  playing = null;
  if (nativePlayer) {
    nativePlayer.pause();
    nativePlayer.remove();
    nativePlayer = null;
  }
}
