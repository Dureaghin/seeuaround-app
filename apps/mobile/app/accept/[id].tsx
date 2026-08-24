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
  Fineprint,
  Headline,
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
  const [peer, setPeer] = useState<{ firstName: string; handle: string } | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      await api.acceptConnection(id);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } finally {
      setLoading(false);
    }
  }

  async function ignore() {
    const state = await refresh();
    router.replace(routeToPath(state!) as never);
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

      <Fineprint
        title="If you accept"
        items={[
          {
            ok: true,
            text: `${peer?.firstName ?? "They"} see which nights you're free. Nothing else.`,
          },
          {
            ok: false,
            text: "Not your location, not who else you know, not what you do.",
          },
        ]}
      />

      <Spacer />
      <Actions row>
        <Button label="Accept" onPress={accept} loading={loading} style={{ flex: 1 }} />
        <Button label="Ignore" onPress={ignore} variant="ghost" style={{ flex: 1 }} />
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
