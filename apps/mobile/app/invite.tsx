import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { Button, HangoutBanner, Screen, Subtitle, TextField, Title } from "../src/components/ui";
import { colors, spacing } from "../src/lib/theme";

export default function InviteScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [inviteUrl, setInviteUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.createInvite().then((r) => setInviteUrl(r.url)).catch(() => {});
  }, []);

  async function addByCode() {
    setLoading(true);
    setMsg("");
    try {
      await api.requestConnection(code.trim().toUpperCase());
      setMsg("Request sent.");
      setCode("");
      const state = await refresh();
      if (state && state.connectionCount >= 5) {
        router.replace(routeToPath(state) as never);
      }
    } catch {
      setMsg("Code not found.");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!inviteUrl) return;
    await Share.share({ message: `Join me on See U Around: ${inviteUrl}` });
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
      <Title>Build your circle</Title>
      <Subtitle>
        You need at least 5 friends for overlap to work. Share your code or link.
      </Subtitle>
      <View style={styles.codeBox}>
        <Text style={styles.code}>{me?.user?.shortCode ?? "…"}</Text>
      </View>
      <Button label="Share invite link" onPress={share} variant="ghost" />
      <Subtitle>Or add someone by their code:</Subtitle>
      <TextField
        value={code}
        onChangeText={setCode}
        placeholder="SU-XXXX-XXXX"
        autoCapitalize="characters"
      />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <Button label="Add friend" onPress={addByCode} loading={loading} />
      <Text style={styles.count}>{me?.connectionCount ?? 0} / 5 connections</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  code: {
    color: colors.lamp,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 2,
  },
  msg: { color: colors.dim, marginBottom: spacing.sm },
  count: { color: colors.dim, textAlign: "center", marginTop: spacing.lg },
});
