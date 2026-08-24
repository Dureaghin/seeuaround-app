import { useState } from "react";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { Button, Screen, Subtitle, Title } from "../src/components/ui";

export default function PauseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function unpause() {
    setLoading(true);
    try {
      const state = await api.unpause();
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>You're paused</Title>
      <Subtitle>Friends see you as unavailable. Tap below when you're back.</Subtitle>
      <Button label="Come back" onPress={unpause} loading={loading} />
    </Screen>
  );
}
