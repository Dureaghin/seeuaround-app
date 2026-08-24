import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
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
} from "../../src/components/ui";

const QUICK = ["On my way", "Running late", "Can't make it"];
const AREA = "Saratoga Springs";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useApp();
  const [thread, setThread] = useState<Awaited<ReturnType<typeof api.getThread>> | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pinnedPlace, setPinnedPlace] = useState<string | null>("The Anchor");

  useEffect(() => {
    if (!id) return;
    const load = () => api.getThread(id).then(setThread).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id]);

  async function send(text?: string) {
    const msg = (text ?? body).trim();
    if (!id || !msg) return;
    setSending(true);
    try {
      await api.sendMessage(id, msg);
      setBody("");
      const updated = await api.getThread(id);
      setThread(updated);
    } finally {
      setSending(false);
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
    const handles = new Set(thread?.messages.map((m) => m.handle) ?? []);
    return Array.from(handles).slice(0, 3).join(", ") || "Your group";
  }, [thread?.messages]);

  const dayTitle = useMemo(() => {
    if (!thread?.expiresAt) return "Tonight";
    return new Date(thread.expiresAt).toLocaleDateString("en-US", { weekday: "long" });
  }, [thread?.expiresAt]);

  const planLabel = pinnedPlace ? `8:00 PM · ${pinnedPlace}` : "8:00 PM · not decided";
  const directionsUrl =
    pinnedPlace && pinnedPlace.toLowerCase() !== "wherever's open"
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pinnedPlace}, ${AREA}`)}`
      : undefined;

  const groupedMessages = useMemo(() => {
    const meId = me?.user?.id;
    const groups: {
      mine: boolean;
      from?: string;
      bodies: string[];
    }[] = [];
    for (const m of thread?.messages ?? []) {
      const mine = m.userId === meId;
      const last = groups[groups.length - 1];
      if (last && last.mine === mine && last.from === (mine ? undefined : m.handle)) {
        last.bodies.push(m.body);
      } else {
        groups.push({ mine, from: mine ? undefined : m.handle, bodies: [m.body] });
      }
    }
    return groups;
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
        directionsUrl={directionsUrl}
      />

      {showPicker ? (
        <PlacePicker
          area={AREA}
          onPin={(name) => {
            setPinnedPlace(name);
          }}
        />
      ) : null}

      <View style={{ marginTop: 18, gap: 3 }}>
        {thread?.messages.length === 0 ? (
          <SysMessage>Everyone's in — say where to meet</SysMessage>
        ) : null}
        {groupedMessages.map((group, gi) => (
          <View
            key={gi}
            style={{ gap: 3, alignItems: group.mine ? "flex-end" : "flex-start", marginTop: 9 }}
          >
            {group.bodies.map((text, bi) => (
              <MessageBubble
                key={`${gi}-${bi}`}
                body={text}
                from={bi === 0 ? group.from : undefined}
                mine={group.mine}
                grouped={bi > 0}
              />
            ))}
          </View>
        ))}
      </View>

      <Spacer />

      <QuickChips chips={QUICK} onPress={(chip) => send(chip)} />
      <Composer
        value={body}
        onChange={setBody}
        onSend={() => send()}
        ready={!!body.trim() && !sending}
      />
    </Screen>
  );
}
