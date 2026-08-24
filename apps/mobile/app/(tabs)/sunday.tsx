import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import {
  Button,
  Eyebrow,
  HangoutBanner,
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
  const { me } = useApp();
  const [nights, setNights] = useState<Night[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getWeek().then((r) => setNights(r.nights)).catch(() => {});
  }, []);

  function toggle(i: number) {
    setNights((prev) => prev.map((n, idx) => (idx === i ? { ...n, free: !n.free } : n)));
  }

  async function save() {
    setSaving(true);
    try {
      const state = await api.setWeek(nights.map(({ date, free }) => ({ date, free })));
      router.replace(routeToPath(state) as never);
    } finally {
      setSaving(false);
    }
  }

  const litCount = nights.filter((n) => n.free).length;
  const eyebrow = me?.weekSet ? "Sunday" : "Sunday · 6:04 PM";

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Eyebrow>{eyebrow}</Eyebrow>
      <Headline>Which nights are you free?</Headline>
      <Sub>Tap the nights you're up for. Clears Monday morning.</Sub>

      <NightStrip nights={nights} onToggle={toggle} />
      <WeekTally count={litCount} />

      <Spacer />
      <Button label={saving ? "Sending…" : "Send it"} onPress={save} loading={saving} />
      <Text style={uiStyles.quiethours}>
        Answer whenever. Nobody gets pinged before 8am their time.
      </Text>
      <QuietLink label="Sit this week out" onPress={() => router.push("/pause")} />
    </Screen>
  );
}
