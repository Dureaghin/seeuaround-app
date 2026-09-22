import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import {
  Actions,
  Button,
  Eyebrow,
  Headline,
  OverlapGrid,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../../src/components/ui";
import { Text } from "react-native";

const AXIS = ["M", "T", "W", "T", "F", "S", "S"];

function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return -1;
  return (new Date(year, month - 1, day).getDay() + 6) % 7;
}

export default function OverlapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me, refresh } = useApp();
  const [overlap, setOverlap] = useState<Awaited<ReturnType<typeof api.getOverlap>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getOverlap(id).then(setOverlap).catch(() => {});
  }, [id]);

  const sharedIndex = useMemo(() => {
    if (!overlap?.nightDate) return -1;
    return weekdayIndex(overlap.nightDate);
  }, [overlap?.nightDate]);

  const rows = useMemo(() => {
    if (!overlap) return [];
    return overlap.members.map((m) => {
      const isYou = m.id === me?.user?.id;
      const freeIndices = (m.freeDates ?? [])
        .map((date) => weekdayIndex(date))
        .filter((index) => index >= 0);
      if (sharedIndex >= 0 && !freeIndices.includes(sharedIndex)) freeIndices.push(sharedIndex);
      return {
        label: isYou ? "You" : m.firstName,
        isYou,
        freeIndices,
      };
    });
  }, [overlap, me?.user?.id, sharedIndex]);

  async function respond(response: "in" | "out") {
    if (!id) return;
    setLoading(true);
    try {
      const state = await api.respondOverlap(id, response);
      router.replace(routeToPath(state) as never);
    } finally {
      setLoading(false);
    }
  }

  const others = overlap?.members.filter((m) => m.id !== me?.user?.id) ?? [];
  const names = others.map((m) => m.firstName).filter((name) => name.trim().length > 0);
  const who =
    names.length === 0
      ? "You"
      : names.length === 1
        ? `You and ${names[0]}`
        : `You, ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const headline = overlap?.dateLabel?.replace(/,.*$/, " night") ?? "Overlap night";

  return (
    <Screen>
      <Eyebrow lamp>Overlap</Eyebrow>
      <Headline>{headline}</Headline>
      <Sub>
        {who} are all free. Nobody had to ask.
      </Sub>

      {rows.length > 0 ? (
        <OverlapGrid rows={rows} axisLabels={AXIS} sharedIndex={sharedIndex} />
      ) : null}

      {overlap?.expiresAt ? (
        <Text style={uiStyles.expiry}>
          Answer by{" "}
          {new Date(overlap.expiresAt).toLocaleString("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          , then it's gone
        </Text>
      ) : (
        <Text style={uiStyles.expiry}>Answer soon, then it's gone</Text>
      )}

      <Spacer />
      {!overlap?.myResponse ? (
        <Actions>
          <Button label="I'm in" onPress={() => respond("in")} loading={loading} />
          <Button label="Not this time" onPress={() => respond("out")} variant="ghost" />
        </Actions>
      ) : (
        <Sub>Waiting for others…</Sub>
      )}
    </Screen>
  );
}
