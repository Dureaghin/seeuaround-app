import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { setToken } from "../../src/lib/auth-store";
import { useApp } from "../../src/context/AppContext";
import {
  recallAuthEmail,
  resolveEmailParam,
} from "../../src/lib/auth-email";
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

function blurActiveElement() {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

export default function CodeScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const router = useRouter();
  const { refresh } = useApp();
  const email = useMemo(
    () => resolveEmailParam(params.email) || recallAuthEmail(),
    [params.email],
  );
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
    blurActiveElement();
    if (!email.includes("@")) {
      setError("Missing email. Go back and enter it again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.verifyCode(email, code);
      await setToken(token);
      try {
        await registerForPush();
      } catch {
        // Push unavailable on web / Expo Go — auth still succeeded.
      }
      const state = await refresh();
      router.replace(state ? (routeToPath(state) as never) : "/age");
    } catch {
      setError("That code isn't right. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendSec > 0 || !email.includes("@")) return;
    setError("");
    try {
      await api.sendCode(email);
      setResendSec(42);
    } catch {
      setError("Could not resend. Try again.");
    }
  }

  const resendLabel =
    resendSec > 0
      ? `Resend in 0:${String(resendSec).padStart(2, "0")}`
      : "Didn't arrive? Send another";

  return (
    <Screen>
      <Eyebrow>Check your email</Eyebrow>
      <Headline>Enter the code.</Headline>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
        <Text style={uiStyles.sentto}>
          Six digits sent to <Text style={uiStyles.senttoBold}>{email || "your email"}</Text>.{" "}
        </Text>
        <Linkish label="Change" onPress={() => router.replace("/(auth)/email")} />
      </View>

      <OtpInput value={code} onChange={setCode} error={!!error} />
      {error ? <ErrText>{error}</ErrText> : null}

      <Pressable onPress={onResend} disabled={resendSec > 0}>
        <Text style={uiStyles.resend}>{resendLabel}</Text>
      </Pressable>

      <Spacer />
      <Button label="Verify" onPress={onVerify} loading={loading} disabled={code.length !== 6} />
      <SmallPrint>The code expires in 10 minutes</SmallPrint>
    </Screen>
  );
}
