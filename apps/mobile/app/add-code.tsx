import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import {
  connectWithFriendCode,
  normalizeFriendCode,
  resolveFriendCodeParam,
} from "../src/lib/friend-code";
import { useApp } from "../src/context/AppContext";
import {
  Actions,
  Button,
  ErrText,
  Eyebrow,
  Headline,
  Screen,
  Spacer,
  Sub,
  TextField,
} from "../src/components/ui";

export default function AddByCodeScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const presetCode = resolveFriendCodeParam(params.code);
  const router = useRouter();
  const { refresh } = useApp();
  const [code, setCode] = useState(presetCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (presetCode) setCode(presetCode);
  }, [presetCode]);

  async function onConnect() {
    setLoading(true);
    setError("");
    try {
      await connectWithFriendCode(code);
      const state = await refresh();
      router.replace(routeToPath(state!) as never);
    } catch (err) {
      if (err instanceof Error && err.message === "invalid_format") {
        setError("Enter a code like SU-XXXX-XXXX.");
      } else {
        setError("That code didn't work. Check it and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Eyebrow>Add someone</Eyebrow>
      <Headline>Enter their code.</Headline>
      <Sub style={{ maxWidth: undefined }}>
        You connect with them — not their whole circle. Nothing happens until you both accept.
      </Sub>

      <TextField
        value={code}
        onChangeText={(v) => {
          setCode(normalizeFriendCode(v));
          setError("");
        }}
        placeholder="SU-XXXX-XXXX"
        autoCapitalize="characters"
        maxLength={12}
      />
      {error ? <ErrText>{error}</ErrText> : null}

      <Spacer />
      <Actions>
        <Button
          label="Connect"
          onPress={onConnect}
          loading={loading}
          disabled={code.replace(/[^A-Z0-9]/g, "").length < 10}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </Actions>
    </Screen>
  );
}
