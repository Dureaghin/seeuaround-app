import { useEffect, useState } from "react";
import { Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import {
  CodeCard,
  Eyebrow,
  GroupHeader,
  HangoutBanner,
  PersonRow,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../src/components/ui";

export default function PeopleScreen() {
  const { me, refresh } = useApp();
  const [connections, setConnections] = useState<
    Awaited<ReturnType<typeof api.getConnections>>["connections"]
  >([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getConnections().then((r) => setConnections(r.connections)).catch(() => {});
  }, []);

  const accepted = connections.filter((c) => c.status === "accepted");
  const freeTonight = accepted.filter((c) => c.freeTonight);
  const notTonight = accepted.filter((c) => !c.freeTonight);

  async function copyCode() {
    const code = me?.user?.shortCode;
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <CodeCard copyLabel={copied ? "Copied" : "Copy"} onCopy={copyCode}>
        <Text style={uiStyles.codeMono}>{me?.user?.shortCode ?? "…"}</Text>
      </CodeCard>

      <Sub style={{ maxWidth: undefined }}>
        Share this to add someone. Both sides accept. Nobody can search for you.
      </Sub>

      {freeTonight.length > 0 ? (
        <>
          <GroupHeader>Free tonight — {freeTonight.length}</GroupHeader>
          {freeTonight.map((c) => (
            <PersonRow key={c.id} name={c.firstName} free />
          ))}
        </>
      ) : null}

      {notTonight.length > 0 ? (
        <>
          <GroupHeader>Not tonight — {notTonight.length}</GroupHeader>
          {notTonight.map((c) => (
            <PersonRow key={c.id} name={c.firstName} />
          ))}
        </>
      ) : accepted.length === 0 ? (
        <>
          <GroupHeader>Not tonight — 0</GroupHeader>
          <Sub style={{ marginTop: 12 }}>No connections yet. Share your invite link.</Sub>
        </>
      ) : null}

      <Spacer />
    </Screen>
  );
}
