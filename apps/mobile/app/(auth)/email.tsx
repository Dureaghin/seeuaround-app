import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { rememberAuthEmail } from "../../src/lib/auth-email";
import {
  Button,
  Eyebrow,
  Fineprint,
  Headline,
  OptIn,
  Screen,
  SmallPrint,
  Spacer,
  Sub,
  TextField,
  uiStyles,
} from "../../src/components/ui";

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onContinue() {
    setLoading(true);
    setError("");
    try {
      await api.sendCode(email.trim());
      rememberAuthEmail(email.trim().toLowerCase());
      router.replace({ pathname: "/(auth)/code", params: { email: email.trim() } });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
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
      <Button
        label="Send me a code"
        onPress={onContinue}
        loading={loading}
        disabled={!email.includes("@")}
      />
      <SmallPrint>18+ only · By continuing you accept the terms</SmallPrint>
    </Screen>
  );
}
