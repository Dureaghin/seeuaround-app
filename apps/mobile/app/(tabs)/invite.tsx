import { useCallback, useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { INVITE_MAX_USES, INVITE_TTL_DAYS } from "@seeuaround/shared";
import { api } from "../../src/lib/api";
import { useCopyFeedback } from "../../src/lib/copy-feedback";
import {
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
  Pips,
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
        applyMeta({});
      });
    }, [loadInvite, applyMeta]),
  );

  const token = useMemo(() => inviteUrl.split("/j/")[1] ?? "", [inviteUrl]);
  const count = me?.connectionCount ?? 0;
  const usesLabel = `${usesRemaining} of ${maxUses}`;

  async function copyLink() {
    await copy(inviteUrl);
  }

  async function share() {
    if (!inviteUrl) return;
    await Share.share({ message: `Join me on See U Around: ${inviteUrl}` });
  }

  return (
    <Screen>
      <Eyebrow>Getting started</Eyebrow>
      <Headline>Add five people.</Headline>
      <Sub>
        See U Around does nothing until your people are here. Five is enough for a week to line up.
      </Sub>

      <CodeCard copied={copied} copyLabel="Copy link" onCopy={copyLink}>
        <Text>
          <Text style={uiStyles.codelinkH}>seeuaround.com/j/</Text>
          <Text style={uiStyles.codelinkT}>{token || "…"}</Text>
        </Text>
      </CodeCard>

      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "rgba(232,230,225,0.10)" }}>
        <LinkRow label="Expires" value={expiresLabel} />
        <LinkRow label="Uses left" value={usesLabel} />
        <LinkRow label="Anyone with the link" value="can ask to connect" />
        <Pressable style={uiStyles.linkctlKill} disabled>
          <Text style={uiStyles.linkctlKillText}>Turn this link off</Text>
        </Pressable>
      </View>

      <Pips filled={count} />

      <Spacer />
      <Actions>
        <Button label="Share the link" onPress={share} />
        <Button
          label="See who's here"
          onPress={async () => {
            await refresh();
            router.push("/people");
          }}
          variant="ghost"
        />
      </Actions>
    </Screen>
  );
}
