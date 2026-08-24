import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { HangoutBanner, Screen, Subtitle, Title } from "../src/components/ui";
import { colors, spacing } from "../src/lib/theme";

type Night = { date: string; label: string; free: boolean };

export default function SundayScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [nights, setNights] = useState<Night[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getWeek().then((r) => setNights(r.nights)).catch(() => {});
  }, []);

  function toggle(i: number) {
    setNights((prev) =>
      prev.map((n, idx) => (idx === i ? { ...n, free: !n.free } : n)),
    );
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

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Title>This week</Title>
      <Subtitle>Tap the nights you're up for going out.</Subtitle>
      <View style={styles.strip}>
        {nights.map((night, i) => (
          <Pressable key={night.date} onPress={() => toggle(i)} style={styles.col}>
            <View style={[styles.bar, night.free && styles.barLit]} />
            <Text style={[styles.label, night.free && styles.labelLit]}>{night.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={save} style={[styles.save, saving && { opacity: 0.7 }]}>
        <Text style={styles.saveText}>{saving ? "Saving…" : "Done"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  col: { alignItems: "center", flex: 1 },
  bar: {
    width: 28,
    height: 120,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    marginBottom: spacing.sm,
  },
  barLit: {
    backgroundColor: colors.lamp,
    shadowColor: colors.lamp,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  label: { color: colors.dim, fontSize: 12, fontWeight: "500" },
  labelLit: { color: colors.lampHot },
  save: {
    backgroundColor: colors.lamp,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: colors.night, fontWeight: "600", fontSize: 16 },
});
