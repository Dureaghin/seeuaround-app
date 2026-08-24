import { useState } from "react";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import { Button, Screen, Subtitle, Title } from "../src/components/ui";

export default function AgeScreen() {
  const router = useRouter();
  const { refresh } = useApp();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const state = await api.confirmAge();
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>18 or older?</Title>
      <Subtitle>
        See U Around is for adults only. By continuing you confirm you are 18 or older.
      </Subtitle>
      <Button label="I'm 18 or older" onPress={confirm} loading={loading} />
    </Screen>
  );
}
