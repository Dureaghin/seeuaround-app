import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { Button, HangoutBanner, Screen, Subtitle, Title } from "../../src/components/ui";
import { colors, spacing } from "../../src/lib/theme";

export default function OverlapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me, refresh } = useApp();
  const [overlap, setOverlap] = useState<Awaited<ReturnType<typeof api.getOverlap>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) api.getOverlap(id).then(setOverlap).catch(() => {});
  }, [id]);

  async function respond(response: "in" | "out") {
    if (!id) return;
    setLoading(true);
    try {
      const state = await api.respondOverlap(id, response);
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  const names = overlap?.members.map((m) => m.firstName).join(", ") ?? "";

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Title>{overlap?.dateLabel ?? "Overlap"}</Title>
      <Subtitle>You, {names} are all free.</Subtitle>
      <View style={styles.card}>
        {overlap?.members.map((m) => (
          <Text key={m.id} style={styles.member}>
            {m.firstName}
            {m.response === "in" ? " ✓" : m.response === "out" ? " ✗" : ""}
          </Text>
        ))}
      </View>
      {!overlap?.myResponse ? (
        <>
          <Button label="I'm in" onPress={() => respond("in")} loading={loading} />
          <Button label="Not this time" onPress={() => respond("out")} variant="ghost" />
        </>
      ) : (
        <Subtitle>You responded. Waiting for others…</Subtitle>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  member: { color: colors.chalk, fontSize: 17, marginBottom: spacing.xs },
});
