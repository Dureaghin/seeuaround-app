import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import { Button, HangoutBanner, Screen, TextField, Title } from "../../src/components/ui";
import { colors, spacing } from "../../src/lib/theme";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useApp();
  const [thread, setThread] = useState<Awaited<ReturnType<typeof api.getThread>> | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = () => api.getThread(id).then(setThread).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id]);

  async function send() {
    if (!id || !body.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(id, body.trim());
      setBody("");
      const updated = await api.getThread(id);
      setThread(updated);
    } finally {
      setSending(false);
    }
  }

  const expires = thread ? new Date(thread.expiresAt) : null;
  const countdown = expires
    ? Math.max(0, Math.floor((expires.getTime() - Date.now()) / 3600000))
    : 0;

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Title>Plan tonight</Title>
      <Text style={styles.countdown}>Disappears in ~{countdown}h</Text>
      <FlatList
        data={thread?.messages ?? []}
        keyExtractor={(m) => m.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.handle}>{item.handle}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <TextField value={body} onChangeText={setBody} placeholder="Say something…" />
      <Button label="Send" onPress={send} loading={sending} disabled={!body.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  countdown: { color: colors.dim, marginBottom: spacing.md },
  list: { flex: 1, marginBottom: spacing.md },
  msg: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  handle: { color: colors.lamp, fontSize: 12, marginBottom: 4 },
  body: { color: colors.chalk, fontSize: 15 },
});
