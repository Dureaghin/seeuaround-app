import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { TabEyebrow } from "../../src/components/AccountSheet";
import {
  ErrText,
  Actions,
  ActiveThreadLink,
  Button,
  Headline,
  NightStrip,
  QuietLink,
  Screen,
  Spacer,
  Sub,
  WeekTally,
  uiStyles,
} from "../../src/components/ui";

type Night = { date: string; label: string; free: boolean };

export default function SundayScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [nights, setNights] = useState<Night[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getWeek().then((r) => setNights(r.nights)).catch(() => {});
    void refresh();
  }, [refresh]);

  function toggle(i: number) {
    setError("");
    setNights((prev) => prev.map((n, idx) => (idx === i ? { ...n, free: !n.free } : n)));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const state = await api.setWeek(nights.map(({ date, free }) => ({ date, free })));
      router.replace(routeToPath(state) as never);
    } catch {
      setError("Could not save your week. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
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
      <WeekTally count={litCount} />

      {showThread ? (
        <ActiveThreadLink
          label={threadLabel}
          names={threadNames}
          onPress={() => router.push(`/thread/${threadId}`)}
          style={{ marginTop: 20 }}
        />
      ) : null}

      <Spacer />
      {error ? <ErrText>{error}</ErrText> : null}
      <Actions>
        <Button label={saving ? "Saving…" : "Save"} onPress={save} loading={saving} />
      </Actions>
      <View style={uiStyles.weekFoot}>
        <Text style={uiStyles.quiethours}>
          Answer whenever.{"\n"}Quiet until 8am their time.
        </Text>
        <QuietLink label="Sit this week out" onPress={() => router.push("/pause")} />
      </View>
    </Screen>
  );
}
