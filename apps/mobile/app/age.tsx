import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { applyPendingFriendCode } from "../src/lib/friend-code";
import { useApp } from "../src/context/AppContext";
import {
  Actions,
  Button,
  DevCheck,
  Eyebrow,
  Fineprint,
  Headline,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../src/components/ui";

export default function AgeScreen() {
  const router = useRouter();
  const { refresh } = useApp();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await api.confirmAge();
      try {
        await applyPendingFriendCode();
      } catch {
        // Age confirmation still succeeds if friend-code apply fails transiently.
      }
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen showLogo>
      <Eyebrow>Signing up</Eyebrow>
      <Headline>See U Around is 18+.</Headline>
      <Sub>Your phone already knows your age band. We ask it. It answers yes or no.</Sub>

      <DevCheck />

      <Fineprint
        title="What we keep"
        items={[
          { ok: true, text: "Yes or no, and the date it was checked." },
          { ok: false, text: "Not your birthday. Not your ID. Not your face." },
        ]}
      />

      <Text style={uiStyles.later}>
        If your region ever needs a stronger check, we'll ask you then — not now.
      </Text>

      <Spacer />
      <Actions>
        <Button label="Continue" onPress={confirm} loading={loading} />
      </Actions>
    </Screen>
  );
}
