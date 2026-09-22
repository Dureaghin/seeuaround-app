import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import {
  Actions,
  Button,
  Eyebrow,
  Headline,
  Mutual,
  Screen,
  SmallPrint,
  Spacer,
  Sub,
} from "../../src/components/ui";
import { colors, fonts } from "../../src/lib/theme";

export default function AcceptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useApp();
  const [peer, setPeer] = useState<{ firstName: string } | null>(null);
  const [busy, setBusy] = useState<"accept" | "ignore" | null>(null);

  useEffect(() => {
    if (id) api.getConnection(id).then(setPeer).catch(() => {});
  }, [id]);

  const initials = peer
    ? peer.firstName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  async function accept() {
    if (!id) return;
    setBusy("accept");
    try {
      await api.acceptConnection(id);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } finally {
      setBusy(null);
    }
  }

  async function ignore() {
    if (!id) return;
    setBusy("ignore");
    try {
      await api.declineConnection(id);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Eyebrow>Invite</Eyebrow>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.headlineWrap}>
        <Headline>
          {peer?.firstName ?? "Someone"}
          {"\n"}wants to connect.
        </Headline>
      </View>
      <Sub style={{ maxWidth: undefined }}>
        Connections go both ways. Until you accept, neither of you can see the other's week.
      </Sub>

      <Mutual
        title="If you accept"
        items={[
          {
            ok: true,
            text: `${peer?.firstName ?? "They"} ${peer?.firstName ? "sees" : "see"} which nights you're free. Nothing else.`,
          },
          {
            ok: false,
            text: "Not your location, not who else you know, not what you do.",
          },
        ]}
      />

      <Spacer />
      <Actions row>
        <Button
          label="Accept"
          onPress={accept}
          loading={busy === "accept"}
          disabled={busy !== null}
          style={{ flex: 1 }}
        />
        <Button
          label="Ignore"
          onPress={ignore}
          variant="ghost"
          loading={busy === "ignore"}
          disabled={busy !== null}
          style={{ flex: 1 }}
        />
      </Actions>
      <SmallPrint>Ignoring is silent. They aren't told.</SmallPrint>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  avatarText: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    color: colors.dim,
  },
  headlineWrap: { marginTop: 20 },
});
