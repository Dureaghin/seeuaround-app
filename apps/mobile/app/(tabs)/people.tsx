import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SITE } from "@seeuaround/shared";
import { api } from "../../src/lib/api";
import { useCopyFeedback } from "../../src/lib/copy-feedback";
import { useApp } from "../../src/context/AppContext";
import { TabEyebrow } from "../../src/components/AccountSheet";
import {
  CodeCard,
  GroupHeader,
  HangoutBanner,
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

      {freeTonight.length > 0 ? (
        <>
          <GroupHeader>Free tonight — {freeTonight.length}</GroupHeader>
          {freeTonight.map((c) => (
            <PersonRow key={c.id} name={c.firstName || "Someone"} free />
          ))}
        </>
      ) : null}

      {notTonight.length > 0 ? (
        <>
          <GroupHeader>Not tonight — {notTonight.length}</GroupHeader>
          {notTonight.map((c) => (
            <PersonRow key={c.id} name={c.firstName || "Someone"} />
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
