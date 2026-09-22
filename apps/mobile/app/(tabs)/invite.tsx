import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { INVITE_MAX_USES, INVITE_TTL_DAYS } from "@seeuaround/shared";
import { api } from "../../src/lib/api";
import { useCopyFeedback } from "../../src/lib/copy-feedback";
import { canShare, shareText } from "../../src/lib/share";
import {
  clearStoredInviteUrl,
  formatInviteExpiry,
  getStoredInviteUrl,
  setStoredInviteUrl,
} from "../../src/lib/invite-store";
import { useApp } from "../../src/context/AppContext";
import { TabEyebrow } from "../../src/components/AccountSheet";
import {
  Actions,
  Button,
  CodeCard,
  Headline,
  LinkRow,
  Panel,
  Pips,
  QuietLink,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../../src/components/ui";

function asCount(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function InviteScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [inviteUrl, setInviteUrl] = useState("");
  const [usesRemaining, setUsesRemaining] = useState(INVITE_MAX_USES);
  const [maxUses, setMaxUses] = useState(INVITE_MAX_USES);
  const [expiresLabel, setExpiresLabel] = useState(`in ${INVITE_TTL_DAYS} days`);
  const [revoking, setRevoking] = useState(false);
  const [creating, setCreating] = useState(false);
  const { copied, copy } = useCopyFeedback("Link copied");

  const applyMeta = useCallback(
    (meta: { usesRemaining?: unknown; maxUses?: unknown; expiresAt?: unknown }) => {
      const max = asCount(meta.maxUses, INVITE_MAX_USES);
      const uses = asCount(meta.usesRemaining, max);
      setMaxUses(max);
      setUsesRemaining(uses);
      setExpiresLabel(
        formatInviteExpiry(
          typeof meta.expiresAt === "string" ? meta.expiresAt : null,
          INVITE_TTL_DAYS,
        ),
      );
    },
    [],
  );

  const creatingInvite = useRef(false);

  const loadInvite = useCallback(async () => {
    const ownerId = me?.user?.id;
    try {
      const active = await api.getActiveInvite();
      const storedUrl = ownerId ? await getStoredInviteUrl(ownerId) : null;
      setInviteUrl(storedUrl ?? "");
      applyMeta(active);
      return;
    } catch {
      // No live link yet — make the first one below.
    }

    if (!ownerId || creatingInvite.current) return;
    creatingInvite.current = true;
    try {
      const created = await api.createInvite();
      await setStoredInviteUrl(created.url, ownerId);
      setInviteUrl(created.url);
      applyMeta(created);
    } finally {
      creatingInvite.current = false;
    }
  }, [applyMeta, me?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadInvite().catch(() => {
        setInviteUrl("");
        applyMeta({});
      });
    }, [loadInvite, applyMeta]),
  );

  const token = useMemo(() => inviteUrl.split("/j/")[1] ?? "", [inviteUrl]);
  const count = me?.connectionCount ?? 0;
  const usesLabel = `${usesRemaining} of ${maxUses}`;
  const shareAvailable = useMemo(() => canShare(), []);
  const hasPeople = count > 0;
  const hasLink = Boolean(inviteUrl);

  async function shareOrCopy() {
    if (!inviteUrl) return;
    const outcome = await shareText({
      title: "See U Around",
      message: `Join me on See U Around: ${inviteUrl}`,
    });
    if (outcome === "unsupported" || !shareAvailable) {
      await copy(inviteUrl);
    }
  }

  async function makeNewLink() {
    setCreating(true);
    try {
      const created = await api.createInvite();
      if (me?.user?.id) await setStoredInviteUrl(created.url, me.user.id);
      setInviteUrl(created.url);
      applyMeta(created);
    } catch {
      // Keep previous state; user can retry.
    } finally {
      setCreating(false);
    }
  }

  function turnOff() {
    if (!hasLink || revoking) return;

    const run = async () => {
      setRevoking(true);
      try {
        await api.revokeInvite();
        await clearStoredInviteUrl();
        setInviteUrl("");
        applyMeta({});
      } catch {
        // leave link as-is
      } finally {
        setRevoking(false);
      }
    };

    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(
          "Turn this link off? Anyone with it won't be able to join. You can make a new one anytime.",
        );
      if (ok) void run();
      return;
    }

    Alert.alert(
      "Turn this link off?",
      "Anyone with it won't be able to join. You can make a new one anytime.",
      [
        { text: "Keep it", style: "cancel" },
        { text: "Turn off", style: "destructive", onPress: () => void run() },
      ],
    );
  }

  const primaryLabel = !hasLink
    ? creating
      ? "Making link…"
      : "Make a new link"
    : hasPeople
      ? "See who's here"
      : shareAvailable
        ? "Share the link"
        : copied
          ? "Link copied"
          : "Copy the link";

  async function onPrimary() {
    if (!hasLink) {
      await makeNewLink();
      return;
    }
    if (hasPeople) {
      await refresh();
      router.push("/people");
      return;
    }
    await shareOrCopy();
  }

  return (
    <Screen>
      <TabEyebrow>Getting started</TabEyebrow>
      <Headline>Add five people.</Headline>
      <Sub>Nothing happens until your people are here. Five is enough.</Sub>

      {hasLink ? (
        <>
          <CodeCard>
            <Text>
              <Text style={uiStyles.codelinkH}>seeuaround.com/j/</Text>
              <Text style={uiStyles.codelinkT}>{token || "…"}</Text>
            </Text>
          </CodeCard>
          <Text style={uiStyles.inviteNote}>
            Anyone with the link can ask to connect. Both sides must accept.
          </Text>

          <Panel>
            <LinkRow label="Expires" value={expiresLabel} />
            <LinkRow label="Uses left" value={usesLabel} />
            <Pressable
              style={uiStyles.linkctlKill}
              onPress={turnOff}
              disabled={revoking}
              accessibilityRole="button"
              accessibilityLabel="Turn this link off"
            >
              <Text style={uiStyles.linkctlKillText}>
                {revoking ? "Turning off…" : "Turn this link off"}
              </Text>
            </Pressable>
          </Panel>
        </>
      ) : (
        <Panel style={{ paddingTop: 16 }}>
          <Text style={uiStyles.inviteOffTitle}>No active link</Text>
          <Text style={uiStyles.inviteNote}>
            Make a new one when you're ready to invite someone.
          </Text>
        </Panel>
      )}

      <Pips filled={count} />

      <Spacer />
      <Actions>
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          loading={creating || revoking}
          disabled={creating || revoking}
        />
        {hasPeople && hasLink ? (
          <Button
            label={
              shareAvailable ? "Share another invite" : copied ? "Link copied" : "Copy the link"
            }
            onPress={shareOrCopy}
            variant="ghost"
          />
        ) : hasPeople && !hasLink ? (
          <Button
            label="See who's here"
            onPress={async () => {
              await refresh();
              router.push("/people");
            }}
            variant="ghost"
          />
        ) : hasLink && !hasPeople ? (
          <Button
            label="See who's here"
            onPress={async () => {
              await refresh();
              router.push("/people");
            }}
            variant="ghost"
          />
        ) : null}
      </Actions>

      {copied && hasLink && !hasPeople ? (
        <QuietLink
          label="Sent it? Check People"
          onPress={async () => {
            await refresh();
            router.push("/people");
          }}
        />
      ) : null}
    </Screen>
  );
}
