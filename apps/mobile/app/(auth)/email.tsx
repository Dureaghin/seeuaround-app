import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SITE } from "@seeuaround/shared";
import { colors, fonts, spacing } from "../../src/lib/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { rememberAuthEmail } from "../../src/lib/auth-email";
import {
  isValidFriendCode,
  normalizeFriendCode,
  rememberPendingFriendCode,
  resolveFriendCodeParam,
} from "../../src/lib/friend-code";
import {
  Actions,
  Button,
  Headline,
  Linkish,
  OptIn,
  Screen,
  Sub,
  TextField,
  uiStyles,
} from "../../src/components/ui";

export default function EmailScreen() {
  const params = useLocalSearchParams<{ friendCode?: string | string[] }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [showFriendCode, setShowFriendCode] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const presetFriendCode = useMemo(
    () => resolveFriendCodeParam(params.friendCode),
    [params.friendCode],
  );

  useEffect(() => {
    if (!presetFriendCode) return;
    setFriendCode(presetFriendCode);
    setShowFriendCode(true);
    rememberPendingFriendCode(presetFriendCode);
  }, [presetFriendCode]);

  async function onContinue() {
    setLoading(true);
    setError("");
    const trimmedEmail = email.trim();
    const trimmedCode = friendCode.trim();

    if (trimmedCode && !isValidFriendCode(trimmedCode)) {
      setError("Friend codes look like SU-XXXX-XXXX.");
      setLoading(false);
      return;
    }

    try {
      await api.sendCode(trimmedEmail);
      rememberAuthEmail(trimmedEmail.toLowerCase());
      if (trimmedCode) rememberPendingFriendCode(trimmedCode);
      router.replace({
        pathname: "/(auth)/code",
        params: {
          email: trimmedEmail,
          ...(trimmedCode ? { friendCode: normalizeFriendCode(trimmedCode) } : {}),
        },
      });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen showLogo>
      <Headline style={styles.title}>What's your email?</Headline>
      <Sub style={styles.sub}>Sign-in only. Friends never see it.</Sub>

      <TextField
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.field}
      />

      {showFriendCode ? (
        <>
          <TextField
            value={friendCode}
            onChangeText={(v) => setFriendCode(normalizeFriendCode(v))}
            placeholder="SU-XXXX-XXXX"
            autoCapitalize="characters"
            maxLength={12}
            style={styles.codeField}
          />
          <Sub style={styles.helper}>You'll connect after you verify.</Sub>
        </>
      ) : (
        <Linkish
          label="Have a friend's code?"
          onPress={() => setShowFriendCode(true)}
          style={styles.link}
        />
      )}

      <OptIn
        checked={optIn}
        onToggle={() => setOptIn((v) => !v)}
        label="Email me about new features."
        style={styles.opt}
      />

      {error ? <Text style={[uiStyles.err, styles.err]}>{error}</Text> : null}

      <Actions style={styles.actions}>
        <Button
          label="Send me a code"
          onPress={onContinue}
          loading={loading}
          disabled={!email.includes("@")}
        />
      </Actions>
      <View style={styles.legalRow}>
        <Text style={styles.legal}>18+</Text>
        <Text style={styles.legal}>·</Text>
        <Pressable
          onPress={() => Linking.openURL(`${SITE}/privacy`)}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Privacy"
        >
          <Text style={styles.legalLink}>Privacy</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/** 8px rhythm: 8 inside a group, 16 for a related control, 24 before a new group, 32 before the commit. */
const styles = StyleSheet.create({
  title: { marginTop: spacing.xxl },
  sub: { marginTop: spacing.sm, maxWidth: 320 },
  field: { marginTop: spacing.xxl },
  codeField: { marginTop: spacing.lg },
  helper: { marginTop: spacing.sm, maxWidth: undefined },
  link: { marginTop: spacing.lg, minHeight: 44, justifyContent: "center" },
  opt: { marginTop: spacing.xxl, minHeight: 44, alignItems: "center" },
  err: { marginTop: spacing.md },
  actions: { marginTop: 32 },
  legalRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  legal: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dim,
  },
  legalLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.chalk,
    textDecorationLine: "underline",
  },
});
