import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { requestDeclaredAge, type AgeSource, type AgeStatus } from "../src/lib/age-range";
import { applyPendingFriendCode } from "../src/lib/friend-code";
import { useApp } from "../src/context/AppContext";
import {
  Actions,
  Button,
  Eyebrow,
  Fineprint,
  Headline,
  OptIn,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../src/components/ui";

export default function AgeScreen() {
  const router = useRouter();
  const { refresh } = useApp();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgeStatus | "checking">("checking");
  const [source, setSource] = useState<AgeSource>("attested");
  const [attested, setAttested] = useState(false);

  useEffect(() => {
    let cancelled = false;
    requestDeclaredAge().then((result) => {
      if (cancelled) return;
      setStatus(result.status);
      setSource(result.source);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const needsAttestation = status === "unavailable" || status === "unknown";
  const blocked = status === "under" || status === "declined";
  const canContinue = status === "adult" || (needsAttestation && attested);

  async function confirm() {
    if (!canContinue) return;
    setLoading(true);
    try {
      await api.confirmAge(status === "adult" ? source : "attested");
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
      <Sub>
        {status === "checking"
          ? "Asking your phone for an age band."
          : status === "adult"
            ? "Your phone said 18 or older. We keep yes, and the date."
            : status === "under"
              ? "Your phone said this account is under 18."
              : status === "declined"
                ? "Your phone didn't share an age band."
                : "This phone can't answer. Say so yourself."}
      </Sub>

      {needsAttestation ? (
        <OptIn
          checked={attested}
          onToggle={() => setAttested((value) => !value)}
          label="I am 18 or older."
        />
      ) : null}

      {blocked ? (
        <Text style={uiStyles.later}>See U Around stays closed.</Text>
      ) : null}

      <Fineprint
        title="What we keep"
        items={[
          { ok: true, text: "Yes or no, and the date it was checked." },
          { ok: false, text: "Not your birthday. Not your ID. Not your face." },
        ]}
      />

      <Spacer />
      {blocked ? null : (
        <Actions>
          <Button
            label={status === "checking" ? "Checking…" : "Continue"}
            onPress={confirm}
            loading={loading}
            disabled={!canContinue}
          />
        </Actions>
      )}
    </Screen>
  );
}
