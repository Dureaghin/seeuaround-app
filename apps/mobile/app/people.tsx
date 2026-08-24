import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { Button, HangoutBanner, Screen, Subtitle, TextField, Title } from "../src/components/ui";
import { colors, spacing } from "../src/lib/theme";

export default function PeopleScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [connections, setConnections] = useState<
    Awaited<ReturnType<typeof api.getConnections>>["connections"]
  >([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getConnections().then((r) => setConnections(r.connections)).catch(() => {});
  }, []);

  async function addByCode() {
    try {
      await api.requestConnection(code.trim().toUpperCase());
      setMsg("Request sent.");
      setCode("");
      const r = await api.getConnections();
      setConnections(r.connections);
      await refresh();
    } catch {
      setMsg("Code not found.");
    }
  }

  const litTonight = connections.filter((c) => c.freeTonight && c.status === "accepted");

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Title>Tonight</Title>
      {litTonight.length === 0 ? (
        <Subtitle>Nobody's lit tonight. Set your week or invite friends.</Subtitle>
      ) : (
        <Subtitle>{litTonight.map((c) => c.firstName).join(", ")} are free tonight.</Subtitle>
      )}
      <FlatList
        data={connections.filter((c) => c.status === "accepted")}
        keyExtractor={(c) => c.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.firstName}</Text>
            <View style={[styles.dot, item.freeTonight && styles.dotLit]} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No connections yet.</Text>}
      />
      <Pressable onPress={() => router.push("/invite")}>
        <Text style={styles.link}>Invite more friends</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/sunday")}>
        <Text style={styles.link}>Set your week</Text>
      </Pressable>
      <Subtitle>Add by code:</Subtitle>
      <TextField value={code} onChangeText={setCode} placeholder="SU-XXXX-XXXX" autoCapitalize="characters" />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <Button label="Add" onPress={addByCode} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, marginVertical: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { color: colors.chalk, fontSize: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface2 },
  dotLit: { backgroundColor: colors.lamp },
  empty: { color: colors.dim, textAlign: "center", marginTop: spacing.lg },
  link: { color: colors.lamp, marginBottom: spacing.sm, fontWeight: "600" },
  msg: { color: colors.dim, marginBottom: spacing.sm },
});
