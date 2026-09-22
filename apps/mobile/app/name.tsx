import { useState } from "react";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { applyPendingInvite } from "../src/lib/invite-pending";
import { useApp } from "../src/context/AppContext";
import { useRouter } from "expo-router";
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

const NAME_RE = /^[\p{L}][\p{L}\s'.-]{0,23}$/u;

export default function NameScreen() {
  const router = useRouter();
  const { setMe, refresh } = useApp();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const firstName = name.trim();
    if (!NAME_RE.test(firstName)) {
      setError("Use the name your friends would say out loud.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.setName(firstName);
      try {
        await applyPendingInvite();
      } catch {
        // The name is saved even if the invite link fails transiently.
      }
      const state = await refresh();
      if (state) setMe(state);
      router.replace(state ? (routeToPath(state) as never) : "/invite");
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen showLogo>
      <Eyebrow>Signing up</Eyebrow>
      <Headline>What should people call you?</Headline>
      <Sub>This is the only name your people see. Not your email.</Sub>
      <TextField
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError("");
        }}
        placeholder="Alex"
        autoCapitalize="words"
        maxLength={24}
      />
      {error ? <ErrText>{error}</ErrText> : null}
      <Spacer />
      <Actions>
        <Button label="Continue" onPress={save} loading={loading} disabled={!name.trim()} />
      </Actions>
    </Screen>
  );
}
