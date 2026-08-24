import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { routeToPath } from "../src/lib/resolveRoute";
import { api } from "../src/lib/api";
import { useApp } from "../src/context/AppContext";
import {
  Actions,
  Button,
  Choice,
  Eyebrow,
  Fineprint,
  Headline,
  Screen,
  Spacer,
  Sub,
} from "../src/components/ui";

const PAUSE_OPTIONS = [
  { id: "week", title: "This week", description: "Back on automatically Sunday evening." },
  {
    id: "month",
    title: "The next month",
    description: "We'll ask once before switching you back on.",
  },
  {
    id: "forever",
    title: "Until I say otherwise",
    description: "No prompts, no reminders. Come back whenever.",
  },
] as const;

export default function PauseScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const [selected, setSelected] = useState<(typeof PAUSE_OPTIONS)[number]["id"]>("week");
  const [loading, setLoading] = useState(false);

  async function sitOut() {
    setLoading(true);
    try {
      const state = await api.pause();
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  async function comeBack() {
    setLoading(true);
    try {
      const state = await api.unpause();
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  if (me?.user?.paused) {
    return (
      <Screen>
        <Eyebrow>Out</Eyebrow>
        <Headline>You're sitting out.</Headline>
        <Sub>Your people don't see a paused label. You simply don't come up.</Sub>
        <Spacer />
        <Actions>
          <Button label="Come back" onPress={comeBack} loading={loading} />
        </Actions>
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Out</Eyebrow>
      <Headline>Sit it out.</Headline>
      <Sub>Life happens. Going quiet here shouldn't cost you anything.</Sub>

      <View style={{ marginTop: 22 }}>
        {PAUSE_OPTIONS.map((opt) => (
          <Choice
            key={opt.id}
            title={opt.title}
            description={opt.description}
            selected={selected === opt.id}
            onPress={() => setSelected(opt.id)}
          />
        ))}
      </View>

      <Fineprint
        title="What your people see"
        items={[
          {
            ok: false,
            text: 'Nothing. No "paused" label, no last-seen, no gap where you used to be.',
          },
          { ok: true, text: "You simply don't come up. Nobody is told, and nobody nudges you." },
        ]}
      />

      <Spacer />
      <Actions>
        <Button label="Sit it out" onPress={sitOut} loading={loading} />
        <Button label="Never mind" onPress={() => router.back()} variant="ghost" />
      </Actions>
    </Screen>
  );
}
