import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SITE } from "@seeuaround/shared";
import { api } from "../../src/lib/api";
import { useCopyFeedback } from "../../src/lib/copy-feedback";
import { useApp } from "../../src/context/AppContext";
import { AccountSheet } from "../../src/components/AccountSheet";
import {
  CodeCard,
  Eyebrow,
  GroupHeader,
  HangoutBanner,
  Linkish,
  PersonRow,
  QuietLink,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../../src/components/ui";

export default function PeopleScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const [connections, setConnections] = useState<
    Awaited<ReturnType<typeof api.getConnections>>["connections"]
  >([]);
  const { copied, copy } = useCopyFeedback("Code copied");

  useEffect(() => {
    api.getConnections().then((r) => setConnections(r.connections)).catch(() => {});
  }, []);

  const accepted = connections.filter((c) => c.status === "accepted");
  const freeTonight = accepted.filter((c) => c.freeTonight);
  const notTonight = accepted.filter((c) => !c.freeTonight);
  const shortCode = me?.user?.shortCode ?? "";
  const qrValue = useMemo(
    () => (shortCode ? `${SITE}/add?code=${encodeURIComponent(shortCode)}` : undefined),
    [shortCode],
  );

  async function copyCode() {
    if (!shortCode) return;
    await copy(shortCode);
  }

  function removePerson(id: string, name: string) {
    const run = async () => {
      await api.blockConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      await refresh();
    };
    const message = `Remove ${name}? They won't see you as free, and they aren't told.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) void run();
      return;
    }
    Alert.alert("Remove them?", message, [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void run() },
    ]);
  }

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={async () => {
            await api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true);
            await refresh();
          }}
          onNo={async () => {
            await api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false);
            await refresh();
          }}
        />
      ) : null}

      <Eyebrow>Your code</Eyebrow>
      <CodeCard copied={copied} onCopy={copyCode} qrValue={qrValue}>
        <Text style={uiStyles.codeMono}>{shortCode || "…"}</Text>
      </CodeCard>

      <Sub style={{ maxWidth: undefined }}>Invite only — both sides accept.</Sub>
      <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Linkish label="Invite someone" onPress={() => router.push("/invite")} />
        <Text style={uiStyles.peopleSep}>·</Text>
        <Linkish label="Add by code" onPress={() => router.push("/add-code")} />
      </View>

      {freeTonight.length > 0 ? (
        <>
          <GroupHeader>Free tonight — {freeTonight.length}</GroupHeader>
          {freeTonight.map((c) => (
            <PersonRow
              key={c.id}
              name={c.firstName || "Someone"}
              free
              onRemove={() => removePerson(c.id, c.firstName || "them")}
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
              onRemove={() => removePerson(c.id, c.firstName || "them")}
            />
          ))}
        </>
      ) : accepted.length === 0 ? (
        <>
          <GroupHeader>Your people</GroupHeader>
          <Sub style={{ marginTop: 12, maxWidth: undefined }}>Nobody here yet.</Sub>
        </>
      ) : null}

      <Spacer />
      <QuietLink label="Account" onPress={() => setAccountOpen(true)} />
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </Screen>
  );
}
