import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { setToken } from "../../src/lib/auth-store";
import { useApp } from "../../src/context/AppContext";
import {
  Button,
  Eyebrow,
  ErrText,
  Headline,
  Linkish,
  OtpInput,
  Screen,
  SmallPrint,
  Spacer,
  uiStyles,
} from "../../src/components/ui";
import { registerForPush } from "../../src/lib/push";

export default function CodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { refresh } = useApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSec, setResendSec] = useState(42);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

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
      setError("That code isn't right. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const resendLabel =
    resendSec > 0
      ? `Resend in 0:${String(resendSec).padStart(2, "0")}`
      : "Resend code";

  return (
    <Screen>
      <Eyebrow>Check your email</Eyebrow>
      <Headline>Enter the code.</Headline>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
        <Text style={uiStyles.sentto}>
          Six digits sent to <Text style={uiStyles.senttoBold}>{email}</Text>.{" "}
        </Text>
        <Linkish label="Change" onPress={() => router.back()} />
      </View>

      <OtpInput value={code} onChange={setCode} error={!!error} />
      {error ? <ErrText>{error}</ErrText> : null}

      <Text style={uiStyles.resend}>{resendLabel}</Text>

      <Spacer />
      <Button label="Verify" onPress={onVerify} loading={loading} disabled={code.length !== 6} />
      <SmallPrint>The code expires in 10 minutes</SmallPrint>
    </Screen>
  );
}
