import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { getToken } from "../../src/lib/auth-store";
import { useApp } from "../../src/context/AppContext";
import {
  Actions,
  Button,
  Headline,
  Screen,
  SmallPrint,
  Spacer,
  Sub,
} from "../../src/components/ui";
import { BrandIcon } from "../../src/components/Logo";
import { colors, fonts, spacing } from "../../src/lib/theme";

export default function InviteLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { refresh } = useApp();
  const [preview, setPreview] = useState<{ firstName: string } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.previewInvite(token).then(setPreview).catch(() => setError(true));
  }, [token]);

  async function connect() {
    if (!token) return;
    const authed = await getToken();
    if (!authed) {
      router.push("/(auth)/email");
      return;
    }
    setLoading(true);
    try {
      await api.connectInvite(token);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <Screen bare showLogo={false}>
        <View style={styles.webChrome}>
          <Text style={styles.webUrl}>🔒 seeuaround.com/j/{token}</Text>
        </View>
        <View style={styles.webBody}>
          <Headline>Invite unavailable</Headline>
          <Sub style={{ maxWidth: undefined }}>This link may have expired.</Sub>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bare showLogo={false}>
      <View style={styles.webChrome}>
        <Text style={styles.webUrl}>
          <Text style={styles.webLock}>🔒 </Text>
          seeuaround.com/j/{token}
        </Text>
      </View>
      <View style={styles.webBody}>
        <BrandIcon size={54} />
        <View style={{ marginTop: 24 }}>
          <Headline>
            {preview?.firstName ?? "…"} wants to{"\n"}see you around.
          </Headline>
        </View>
        <Sub style={{ maxWidth: undefined, marginTop: 13 }}>
          See U Around tells you when you and your people are free the same night.{" "}
          <Text style={styles.subBold}>That's the whole app.</Text>
        </Sub>

        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={styles.factIcon}>✓</Text>
            <Text style={styles.factText}>
              You pick your free nights <Text style={styles.factBold}>once a week</Text>. Two
              seconds.
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factIcon}>✓</Text>
            <Text style={styles.factText}>
              If a night lines up, <Text style={styles.factBold}>everyone gets told at once</Text>.
              No asking.
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factIcon, styles.factIconNo]}>✕</Text>
            <Text style={styles.factText}>No phone number. No feed. No strangers.</Text>
          </View>
        </View>

        <Spacer />
        <Actions>
          <Button label="Get See U Around" onPress={connect} loading={loading} />
          <Button
            label="I already have it"
            onPress={connect}
            variant="ghost"
            loading={loading}
          />
        </Actions>
        <SmallPrint>
          18+ · This link stops working in 7 days{"\n"}
          {preview?.firstName ?? "They"} can turn it off sooner
        </SmallPrint>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  webChrome: { paddingTop: 52, paddingHorizontal: 14, paddingBottom: 12 },
  webUrl: {
    backgroundColor: colors.surface2,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.dim,
  },
  webLock: { color: colors.lamp, fontSize: 10 },
  webBody: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 26,
    paddingTop: 32,
  },
  subBold: { color: colors.chalk, fontFamily: fonts.bodyMedium },
  facts: { marginTop: 24, borderTopWidth: 1, borderTopColor: colors.line },
  fact: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  factIcon: { color: colors.lamp, fontSize: 13.5 },
  factIconNo: { color: colors.muted },
  factText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.dim,
  },
  factBold: { color: colors.chalk, fontFamily: fonts.bodyMedium },
});
