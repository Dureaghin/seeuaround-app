import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { Button, Screen, Subtitle, TextField, Title } from "../../src/components/ui";

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onContinue() {
    setLoading(true);
    setError("");
    try {
      await api.sendCode(email.trim());
      router.push({ pathname: "/(auth)/code", params: { email: email.trim() } });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>See U Around</Title>
      <Subtitle>Enter your email. We'll send a six-digit code — no password.</Subtitle>
      <TextField
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {error ? <Subtitle>{error}</Subtitle> : null}
      <Button label="Send code" onPress={onContinue} loading={loading} disabled={!email.includes("@")} />
    </Screen>
  );
}
