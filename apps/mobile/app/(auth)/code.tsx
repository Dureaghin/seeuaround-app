import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { setToken } from "../../src/lib/auth-store";
import { useApp } from "../../src/context/AppContext";
import { Button, Screen, Subtitle, TextField, Title } from "../../src/components/ui";
import { registerForPush } from "../../src/lib/push";

export default function CodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { refresh } = useApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onVerify() {
    setLoading(true);
    setError("");
    try {
      const { token } = await api.verifyCode(email!, code);
      await setToken(token);
      await registerForPush();
      const state = await refresh();
      router.replace(state ? (routeToPath(state) as never) : "/age");
    } catch {
      setError("Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Check your email</Title>
      <Subtitle>Enter the six-digit code we sent to {email}.</Subtitle>
      <TextField
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
      />
      {error ? <Subtitle>{error}</Subtitle> : null}
      <Button label="Continue" onPress={onVerify} loading={loading} disabled={code.length !== 6} />
    </Screen>
  );
}
