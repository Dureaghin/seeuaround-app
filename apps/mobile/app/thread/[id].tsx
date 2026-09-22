import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useIsFocused, useLocalSearchParams } from "expo-router";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { playVoiceUrl, startVoiceRecording, stopVoicePlayback, type VoiceClip } from "../../src/lib/voice";
import {
  Composer,
  MessageBubble,
  PlacePicker,
  PlanBar,
  QuickChips,
  Screen,
  Spacer,
  SysMessage,
  ThreadHeader,
  VoiceBubble,
} from "../../src/components/ui";

const QUICK = ["On my way", "Running late", "Can't make it"];
const VOICE_LIMIT_MS = 60_000;

type Thread = Awaited<ReturnType<typeof api.getThread>>;
type Plan = Thread["plan"];

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const focused = useIsFocused();
  const { me } = useApp();
  const [thread, setThread] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const recorder = useRef<{ stop: () => Promise<VoiceClip> } | null>(null);
  const finishing = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id || !focused) return;
    const load = () => api.getThread(id).then(setThread).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id, focused]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopVoicePlayback();
    };
  }, []);

  function applyPlan(plan: Plan) {
    setThread((prev) => (prev ? { ...prev, plan } : prev));
  }

  async function reload() {
    if (!id) return;
    const updated = await api.getThread(id);
    setThread(updated);
  }

  async function send(text?: string) {
    const msg = (text ?? body).trim();
    if (!id || !msg || sending) return;
    setSending(true);
    try {
      await api.sendMessage(id, { body: msg });
      setBody("");
      await reload();
    } finally {
      setSending(false);
    }
  }

  async function finishRecording() {
    if (finishing.current) return;
    finishing.current = true;
    const rec = recorder.current;
    recorder.current = null;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    setRecording(false);
    if (!rec || !id) {
      finishing.current = false;
      return;
    }
    setSending(true);
    try {
      const clip = await rec.stop();
      if (clip.durationMs < 400) return;
      await api.sendMessage(id, {
        audio: clip.audio,
        mime: clip.mime,
        durationMs: Math.min(clip.durationMs, VOICE_LIMIT_MS),
      });
      await reload();
    } catch {
      setVoiceHint("Allow the microphone to leave a voice note.");
    } finally {
      finishing.current = false;
      setSending(false);
    }
  }

  async function onMic() {
    if (sending) return;
    if (recording) {
      await finishRecording();
      return;
    }
    setVoiceHint(null);
    try {
      const rec = await startVoiceRecording();
      recorder.current = rec;
      setRecording(true);
      stopTimer.current = setTimeout(() => {
        void finishRecording();
      }, VOICE_LIMIT_MS);
    } catch {
      setVoiceHint("Allow the microphone to leave a voice note.");
    }
  }

  async function vote(name: string | null) {
    if (!id) return;
    const res = name ? await api.votePlace(id, name) : await api.clearVote(id);
    applyPlan(res.plan);
  }

  async function saveArea(area: string) {
    if (!id) return;
    const res = await api.setArea(id, area);
    applyPlan(res.plan);
  }

  async function play(messageId: string) {
    if (!id) return;
    if (playingId === messageId) {
      stopVoicePlayback();
      setPlayingId(null);
      return;
    }
    try {
      const url = await api.messageAudioUrl(id, messageId);
      setPlayingId(messageId);
      await playVoiceUrl(url, () => {
        setPlayingId((current) => (current === messageId ? null : current));
      });
    } catch {
      setPlayingId(null);
    }
  }

  const { countdown, countdownSub } = useMemo(() => {
    if (!thread?.expiresAt) return { countdown: "GONE SOON", countdownSub: undefined };
    const ms = new Date(thread.expiresAt).getTime() - Date.now();
    const h = Math.max(0, Math.floor(ms / 3600000));
    const d = Math.floor(h / 24);
    const rh = h % 24;
    const sub = new Date(thread.expiresAt)
      .toLocaleString("en-US", { weekday: "short", hour: "numeric" })
      .toUpperCase();
    return {
      countdown: d > 0 ? `GONE IN ${d}D ${String(rh).padStart(2, "0")}H` : `GONE IN ${rh}H`,
      countdownSub: sub,
    };
  }, [thread?.expiresAt]);

  const memberNames = useMemo(() => {
    const names = new Set(
      thread?.messages
        .filter((m) => m.userId !== me?.user?.id)
        .map((m) => m.firstName)
        .filter(Boolean) ?? [],
    );
    return Array.from(names).slice(0, 3).join(", ") || "Your group";
  }, [thread?.messages, me?.user?.id]);

  const dayTitle = useMemo(() => {
    if (!thread?.expiresAt) return "Tonight";
    return new Date(thread.expiresAt).toLocaleDateString("en-US", { weekday: "long" });
  }, [thread?.expiresAt]);

  const plan = thread?.plan;
  const area = plan?.area || "Saratoga Springs";
  const pinnedPlace = plan?.pinnedPlace ?? null;
  const planLabel = pinnedPlace ? `8:00 PM · ${pinnedPlace}` : "8:00 PM · not decided";
  const directionsUrl =
    pinnedPlace && pinnedPlace.toLowerCase() !== "wherever's open"
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pinnedPlace}, ${area}`)}`
      : undefined;

  const timeline = useMemo(() => {
    const meId = me?.user?.id;
    const items: (
      | { kind: "text"; key: string; mine: boolean; from?: string; bodies: string[] }
      | { kind: "voice"; key: string; mine: boolean; from?: string; durationMs: number }
    )[] = [];
    for (const m of thread?.messages ?? []) {
      const mine = m.userId === meId;
      const from = mine ? undefined : m.firstName || "Someone";
      if (m.durationMs) {
        items.push({ kind: "voice", key: m.id, mine, from, durationMs: m.durationMs });
        continue;
      }
      const last = items[items.length - 1];
      if (last && last.kind === "text" && last.mine === mine && last.from === from) {
        last.bodies.push(m.body);
      } else {
        items.push({ kind: "text", key: m.id, mine, from, bodies: [m.body] });
      }
    }
    return items;
  }, [thread?.messages, me?.user?.id]);

  return (
    <Screen>
      <ThreadHeader
        title={dayTitle}
        subtitle={`You, ${memberNames}`}
        countdown={countdown}
        countdownSub={countdownSub}
      />

      <PlanBar
        plan={planLabel}
        onWherePress={() => setShowPicker((v) => !v)}
        whereOpen={showPicker}
        directionsUrl={directionsUrl}
      />

      {showPicker && plan ? (
        <PlacePicker area={area} places={plan.places} onVote={vote} onArea={saveArea} />
      ) : null}

      <View style={{ marginTop: 18, gap: 3 }}>
        {thread?.messages.length === 0 ? (
          <SysMessage>Everyone's in — say where to meet</SysMessage>
        ) : null}
        {timeline.map((item) =>
          item.kind === "voice" ? (
            <View
              key={item.key}
              style={{ alignItems: item.mine ? "flex-end" : "flex-start", marginTop: 9 }}
            >
              <VoiceBubble
                durationMs={item.durationMs}
                from={item.from}
                mine={item.mine}
                playing={playingId === item.key}
                onPress={() => play(item.key)}
              />
            </View>
          ) : (
            <View
              key={item.key}
              style={{ gap: 3, alignItems: item.mine ? "flex-end" : "flex-start", marginTop: 9 }}
            >
              {item.bodies.map((text, bi) => (
                <MessageBubble
                  key={`${item.key}-${bi}`}
                  body={text}
                  from={bi === 0 ? item.from : undefined}
                  mine={item.mine}
                  grouped={bi > 0}
                />
              ))}
            </View>
          ),
        )}
      </View>

      <Spacer />

      <QuickChips chips={QUICK} onPress={(chip) => send(chip)} />
      <Composer
        value={body}
        onChange={setBody}
        onSend={() => send()}
        ready={!!body.trim() && !sending && !recording}
        recording={recording}
        onMic={() => {
          void onMic();
        }}
        hint={voiceHint}
      />
    </Screen>
  );
}
