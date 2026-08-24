import { useEffect, useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import {
  Actions,
  Button,
  CodeCard,
  Eyebrow,
  HangoutBanner,
  Headline,
  LinkRow,
  Pips,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../src/components/ui";
import * as Clipboard from "expo-clipboard";

export default function InviteScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.createInvite().then((r) => setInviteUrl(r.url)).catch(() => {});
  }, []);

  const token = useMemo(() => inviteUrl.split("/j/")[1] ?? "", [inviteUrl]);
  const count = me?.connectionCount ?? 0;

  async function copyLink() {
    if (!inviteUrl) return;
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!inviteUrl) return;
    await Share.share({ message: `Join me on See U Around: ${inviteUrl}` });
  }

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Eyebrow>Getting started</Eyebrow>
      <Headline>Add five people.</Headline>
      <Sub>
        See U Around does nothing until your people are here. Five is enough for a week to line up.
      </Sub>

      <CodeCard copyLabel={copied ? "Copied" : "Copy link"} onCopy={copyLink}>
        <Text>
          <Text style={uiStyles.codelinkH}>seeuaround.com/j/</Text>
          <Text style={uiStyles.codelinkT}>{token || "…"}</Text>
        </Text>
      </CodeCard>

      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "rgba(232,230,225,0.10)" }}>
        <LinkRow label="Expires" value="in 7 days" />
        <LinkRow label="Uses left" value={`${Math.max(0, 5 - count)} of 5`} />
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
