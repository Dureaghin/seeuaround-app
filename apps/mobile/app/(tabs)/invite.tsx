import { useCallback, useMemo, useState } from "react";
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
import {
  Actions,
  Button,
  CodeCard,
  Eyebrow,
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

  const loadInvite = useCallback(async () => {
    try {
      const active = await api.getActiveInvite();
      const storedUrl = await getStoredInviteUrl();
      if (storedUrl) {
        setInviteUrl(storedUrl);
        applyMeta(active);
        return;
      }
    } catch {
      // No active invite — create a fresh link below.
    }

    const created = await api.createInvite();
    await setStoredInviteUrl(created.url);
    setInviteUrl(created.url);
    applyMeta(created);
  }, [applyMeta]);

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
      await setStoredInviteUrl(created.url);
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

  const primaryLabel = hasPeople
    ? "See who's here"
    : !hasLink
      ? creating
        ? "Making link…"
        : "Make a new link"
      : shareAvailable
        ? "Share the link"
        : copied
          ? "Link copied"
          : "Copy the link";

  async function onPrimary() {
    if (hasPeople) {
      await refresh();
      router.push("/people");
      return;
    }
    if (!hasLink) {
      await makeNewLink();
      return;
    }
    await shareOrCopy();
  }

  return (
    <Screen>
      <Eyebrow>Getting started</Eyebrow>
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
