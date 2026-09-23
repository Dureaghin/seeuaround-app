import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SITE } from "@seeuaround/shared";
import { api } from "../../src/lib/api";
import { useCopyFeedback } from "../../src/lib/copy-feedback";
import { useApp } from "../../src/context/AppContext";
import { TabEyebrow } from "../../src/components/AccountSheet";
import {
  ActiveThreadLink,
  CodeCard,
  GroupHeader,
  Linkish,
  PersonRow,
  Screen,
  Sub,
  uiStyles,
} from "../../src/components/ui";

export default function PeopleScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [connections, setConnections] = useState<
    Awaited<ReturnType<typeof api.getConnections>>["connections"]
  >([]);
  const { copied, copy } = useCopyFeedback("Code copied");

  useEffect(() => {
    api.getConnections().then((r) => setConnections(r.connections)).catch(() => {});
    void refresh();
  }, [refresh]);

  const accepted = connections.filter((c) => c.status === "accepted");
  const freeTonight = accepted.filter((c) => c.freeTonight);
  const notTonight = accepted.filter((c) => !c.freeTonight);
  const shortCode = me?.user?.shortCode ?? "";
  const threadId = me?.activeThreadId ?? null;
  const threadLabel = me?.activeThreadLabel?.trim() || "Tonight";
  const threadNames = me?.activeThreadNames ?? [];
  const showThread = Boolean(threadId && me?.activeThreadNightDate);
  const qrValue = useMemo(
    () => (shortCode ? `${SITE}/add?code=${encodeURIComponent(shortCode)}` : undefined),
    [shortCode],
  );

  async function copyCode() {
    if (!shortCode) return;
    await copy(shortCode);
  }

  function blockPerson(id: string, name: string) {
    const run = async () => {
      await api.blockConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      await refresh();
    };
    const message = `${name} won't be told. They drop out of nights that haven't started.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Block ${name}? ${message}`)) void run();
      return;
    }
    Alert.alert(`Block ${name}?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: () => void run() },
    ]);
  }

  return (
    <Screen>
      <TabEyebrow>Your code</TabEyebrow>
      <CodeCard copied={copied} onCopy={copyCode} qrValue={qrValue}>
        <Text style={uiStyles.codeMono}>{shortCode || "…"}</Text>
      </CodeCard>

      <Sub style={{ maxWidth: undefined }}>Invite only — both sides accept.</Sub>
      <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Linkish label="Invite someone" onPress={() => router.push("/invite")} />
        <Text style={uiStyles.peopleSep}>·</Text>
        <Linkish label="Add by code" onPress={() => router.push("/add-code")} />
      </View>

      {showThread ? (
        <ActiveThreadLink
          label={threadLabel}
          names={threadNames}
          onPress={() => router.push(`/thread/${threadId}`)}
          style={{ marginTop: 22 }}
        />
      ) : null}

      {freeTonight.length > 0 ? (
        <>
          <GroupHeader>Free tonight — {freeTonight.length}</GroupHeader>
          {freeTonight.map((c) => (
            <PersonRow
              key={c.id}
              name={c.firstName || "Someone"}
              free
              onBlock={() => blockPerson(c.id, c.firstName || "Someone")}
            />
          ))}
        </>
      ) : null}

      {notTonight.length > 0 ? (
        <>
          <GroupHeader>Not tonight — {notTonight.length}</GroupHeader>
          {notTonight.map((c) => (
            <PersonRow
              key={c.id}
              name={c.firstName || "Someone"}
              onBlock={() => blockPerson(c.id, c.firstName || "Someone")}
            />
          ))}
        </>
      ) : accepted.length === 0 ? (
        <>
          <GroupHeader>Your people</GroupHeader>
          <Sub style={{ marginTop: 12, maxWidth: undefined }}>Nobody here yet.</Sub>
        </>
      ) : null}

    </Screen>
  );
}
