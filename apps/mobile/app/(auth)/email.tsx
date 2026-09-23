import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type TextInput } from "react-native";
import { SITE, SendCodeSchema } from "@seeuaround/shared";
import { colors, fonts, spacing } from "../../src/lib/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError, api } from "../../src/lib/api";
import { recallAuthEmail, rememberAuthEmail } from "../../src/lib/auth-email";
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

function isValidEmail(value: string): boolean {
  return SendCodeSchema.safeParse({ email: value.trim() }).success;
}

export default function EmailScreen() {
  const params = useLocalSearchParams<{ friendCode?: string | string[] }>();
  const router = useRouter();
  const codeRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(() => recallAuthEmail());
  const [friendCode, setFriendCode] = useState("");
  const [showFriendCode, setShowFriendCode] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const presetFriendCode = useMemo(
    () => resolveFriendCodeParam(params.friendCode),
    [params.friendCode],
  );
  const emailValid = isValidEmail(email);
  const emailHint =
    touched && email.trim() && !emailValid ? "Enter a valid email address." : "";

  useEffect(() => {
    if (!presetFriendCode) return;
    setFriendCode(presetFriendCode);
    setShowFriendCode(true);
    rememberPendingFriendCode(presetFriendCode);
  }, [presetFriendCode]);

  async function onContinue() {
    if (loading) return;
    setTouched(true);
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = friendCode.trim();

    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (trimmedCode && !isValidFriendCode(trimmedCode)) {
      setError("Friend codes look like SU-XXXX-XXXX.");
      return;
    }

    setLoading(true);
    try {
      await api.sendCode(trimmedEmail);
      rememberAuthEmail(trimmedEmail);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("seeuaround_marketing_opt_in", optIn ? "1" : "0");
      }
      if (trimmedCode) rememberPendingFriendCode(trimmedCode);
      router.replace({
        pathname: "/(auth)/code",
        params: {
          email: trimmedEmail,
          ...(trimmedCode ? { friendCode: normalizeFriendCode(trimmedCode) } : {}),
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many tries. Wait a minute and try again.");
      } else {
        setError("Something went wrong. Try again.");
      }
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
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError("");
        }}
        onBlur={() => setTouched(true)}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        inputMode="email"
        importantForAutofill="yes"
        autoFocus={!email}
        returnKeyType={showFriendCode ? "next" : "send"}
        enterKeyHint={showFriendCode ? "next" : "send"}
        onSubmitEditing={() => {
          if (showFriendCode) {
            codeRef.current?.focus();
            return;
          }
          void onContinue();
        }}
        accessibilityLabel="Email"
        style={styles.field}
      />
      {emailHint ? <Text style={[uiStyles.err, styles.fieldHint]}>{emailHint}</Text> : null}

      {showFriendCode ? (
        <>
          <TextField
            ref={codeRef}
            value={friendCode}
            onChangeText={(v) => {
              setFriendCode(normalizeFriendCode(v));
              if (error) setError("");
            }}
            placeholder="SU-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            textContentType="none"
            maxLength={12}
            returnKeyType="send"
            enterKeyHint="send"
            onSubmitEditing={() => {
              void onContinue();
            }}
            accessibilityLabel="Friend code"
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
          onPress={() => {
            void onContinue();
          }}
          loading={loading}
          disabled={!emailValid}
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
  fieldHint: { marginTop: spacing.sm },
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
