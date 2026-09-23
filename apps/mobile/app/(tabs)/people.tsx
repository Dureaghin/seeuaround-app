import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
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

type Connection = Awaited<ReturnType<typeof api.getConnections>>["connections"][number];

export default function PeopleScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [blocked, setBlocked] = useState<Connection | null>(null);
  const { copied, copy } = useCopyFeedback("Code copied");
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBlock = useRef<string | null>(null);

  useEffect(() => {
    api.getConnections().then((r) => setConnections(r.connections)).catch(() => {});
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (pendingBlock.current) {
        void api.blockConnection(pendingBlock.current).catch(() => {});
      }
    };
  }, []);

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

  function commitBlock(id: string) {
    pendingBlock.current = null;
    void api.blockConnection(id).then(() => refresh()).catch(() => {});
  }

  function blockPerson(row: Connection) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (pendingBlock.current && pendingBlock.current !== row.id) {
      commitBlock(pendingBlock.current);
    }
    setConnections((prev) => prev.filter((c) => c.id !== row.id));
    setBlocked(row);
    pendingBlock.current = row.id;
    undoTimer.current = setTimeout(() => {
      commitBlock(row.id);
      setBlocked(null);
    }, 5000);
  }

  function undoBlock() {
    if (!blocked) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    pendingBlock.current = null;
    setConnections((prev) => [...prev, blocked]);
    setBlocked(null);
  }

  return (
    <Screen>
      <TabEyebrow>Your code</TabEyebrow>
      <CodeCard copied={copied} onCopy={copyCode} qrValue={qrValue}>
        <Text style={uiStyles.codeMono}>{shortCode || "…"}</Text>
      </CodeCard>

      <Sub style={{ maxWidth: undefined }}>Invite only — both sides accept.</Sub>
      <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 }}>
        <Linkish label="Invite someone" onPress={() => router.push("/invite")} style={{ minHeight: 36 }} />
        <Text style={uiStyles.peopleSep}>·</Text>
        <Linkish label="Add by code" onPress={() => router.push("/add-code")} style={{ minHeight: 36 }} />
      </View>

      {showThread ? (
        <ActiveThreadLink
          label={threadLabel}
          names={threadNames}
          onPress={() => router.push(`/thread/${threadId}`)}
          style={{ marginTop: 22 }}
        />
      ) : null}

      {blocked ? (
        <View style={uiStyles.blockUndo}>
          <Text style={uiStyles.blockUndoText}>Blocked {blocked.firstName || "them"}.</Text>
          <Pressable
            onPress={undoBlock}
            accessibilityRole="button"
            accessibilityLabel="Undo block"
            hitSlop={8}
          >
            <Text style={uiStyles.blockUndoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {freeTonight.length > 0 ? (
        <>
          <GroupHeader>Free tonight — {freeTonight.length}</GroupHeader>
          {freeTonight.map((c) => (
            <PersonRow
              key={c.id}
              name={c.firstName || "Someone"}
              free
              onBlock={() => blockPerson(c)}
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
              onBlock={() => blockPerson(c)}
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
