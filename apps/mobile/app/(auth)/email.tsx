import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
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
  Eyebrow,
  Fineprint,
  Headline,
  Linkish,
  OptIn,
  Screen,
  SmallPrint,
  Spacer,
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
      <Eyebrow>Signing up</Eyebrow>
      <Headline>What's your email?</Headline>
      <Sub>
        It signs you in, and it's how you get your circle back if you lose your phone.
      </Sub>

      <TextField
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {showFriendCode ? (
        <>
          <TextField
            value={friendCode}
            onChangeText={(v) => setFriendCode(normalizeFriendCode(v))}
            placeholder="SU-XXXX-XXXX"
            autoCapitalize="characters"
            maxLength={12}
          />
          <Sub style={{ maxWidth: undefined, marginTop: 11 }}>
            You'll connect with this person after you verify — not their whole circle.
          </Sub>
        </>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Linkish label="Have a friend's code?" onPress={() => setShowFriendCode(true)} />
        </View>
      )}

      <Fineprint
        title="What we do with it"
        items={[
          { ok: true, text: "Send you a code. That's how you sign in — no password." },
          { ok: true, text: "Get your circle back if you lose your phone." },
          { ok: true, text: "Keep bulk fake signups down. One inbox, one account." },
          { ok: false, text: "Never shown to your friends. They see your name, not this." },
          { ok: false, text: "Never sold, never given to anyone." },
        ]}
      />

      <OptIn
        checked={optIn}
        onToggle={() => setOptIn((v) => !v)}
        label="Email me when there's a new feature. Off unless you tick it — otherwise we only ever send a sign-in code."
      />

      {error ? <Text style={uiStyles.err}>{error}</Text> : null}

      <Spacer />
      <Actions>
        <Button
          label="Send me a code"
          onPress={onContinue}
          loading={loading}
          disabled={!email.includes("@")}
        />
      </Actions>
      <SmallPrint>18+ only · By continuing you accept the terms</SmallPrint>
    </Screen>
  );
}
