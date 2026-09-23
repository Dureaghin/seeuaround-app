import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { TabEyebrow } from "../../src/components/AccountSheet";
import {
  ErrText,
  ActiveThreadLink,
  Headline,
  NightStrip,
  QuietLink,
  Screen,
  Sub,
  WeekTally,
  uiStyles,
} from "../../src/components/ui";

type Night = { date: string; label: string; free: boolean };

export default function SundayScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [nights, setNights] = useState<Night[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const pending = useRef<Night[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    api.getWeek().then((r) => setNights(r.nights)).catch(() => {});
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pending.current && !saving.current) {
        void api.setWeek(pending.current.map(({ date, free }) => ({ date, free }))).catch(() => {});
      }
    };
  }, []);

  async function flushSave() {
    const snapshot = pending.current;
    if (!snapshot || saving.current) return;
    saving.current = true;
    setSaveState("saving");
    setError("");
    try {
      await api.setWeek(snapshot.map(({ date, free }) => ({ date, free })));
      pending.current = null;
      await refresh();
      setSaveState("saved");
    } catch {
      setError("Could not save your week. Check your connection and try again.");
      setSaveState("idle");
    } finally {
      saving.current = false;
    }
  }

  function scheduleSave(next: Night[]) {
    pending.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, 600);
  }

  function toggle(i: number) {
    setError("");
    setNights((prev) => {
      const next = prev.map((n, idx) => (idx === i ? { ...n, free: !n.free } : n));
      scheduleSave(next);
      return next;
    });
  }

  const litCount = nights.filter((n) => n.free).length;
  const eyebrow = me?.weekSet ? "This week" : "Sunday";
  const threadId = me?.activeThreadId ?? null;
  const threadLabel = me?.activeThreadLabel?.trim() || "Tonight";
  const threadNames = me?.activeThreadNames ?? [];
  const threadNight = me?.activeThreadNightDate ?? null;
  // Only the hangout night counts — not "any night lit".
  const hangoutNightLit = nights.some((n) => {
    if (!n.free) return false;
    if (threadNight && n.date === threadNight) return true;
    const day = threadLabel.trim().toLowerCase();
    if (!day || day === "tonight") return false;
    const short = n.label.trim().toLowerCase();
    return day.startsWith(short) || short.startsWith(day.slice(0, 3));
  });
  const showThread = Boolean(threadId && hangoutNightLit);

  return (
    <Screen>
      <TabEyebrow>{eyebrow}</TabEyebrow>
      <Headline>Which nights are you free?</Headline>
      <Sub>Tap the nights you're up for. Clears Monday morning.</Sub>

      <NightStrip nights={nights} onToggle={toggle} />
      <WeekTally
        count={litCount}
        saveLabel={saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : undefined}
      />

      {showThread ? (
        <ActiveThreadLink
          label={threadLabel}
          names={threadNames}
          onPress={() => router.push(`/thread/${threadId}`)}
          style={{ marginTop: 20 }}
        />
      ) : null}

      {error ? <ErrText>{error}</ErrText> : null}
      <View style={uiStyles.weekFoot}>
        <Text style={uiStyles.quiethours}>
          Answer whenever. Nobody gets pinged before 8am their time.
        </Text>
        <QuietLink label="Sit this week out" onPress={() => router.push("/pause")} />
      </View>
    </Screen>
  );
}
