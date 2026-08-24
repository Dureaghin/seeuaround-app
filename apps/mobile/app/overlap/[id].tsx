import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { routeToPath } from "../../src/lib/resolveRoute";
import { api } from "../../src/lib/api";
import { useApp } from "../../src/context/AppContext";
import {
  Actions,
  Button,
  Eyebrow,
  HangoutBanner,
  Headline,
  OverlapGrid,
  Screen,
  Spacer,
  Sub,
  uiStyles,
} from "../../src/components/ui";
import { Text } from "react-native";

const AXIS = ["M", "T", "W", "T", "F", "S", "S"];

export default function OverlapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me, refresh } = useApp();
  const [overlap, setOverlap] = useState<Awaited<ReturnType<typeof api.getOverlap>> | null>(null);
  const [myWeek, setMyWeek] = useState<{ date: string; free: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getOverlap(id).then(setOverlap).catch(() => {});
    api.getWeek().then((r) => setMyWeek(r.nights)).catch(() => {});
  }, [id]);

  const sharedIndex = useMemo(() => {
    if (!overlap?.nightDate) return 3;
    const idx = myWeek.findIndex((n) => n.date === overlap.nightDate);
    return idx >= 0 ? idx : 3;
  }, [overlap?.nightDate, myWeek]);

  const rows = useMemo(() => {
    if (!overlap) return [];
    return overlap.members.map((m) => {
      const isYou = m.id === me?.user?.id;
      const freeIndices = isYou
        ? myWeek.map((n, i) => (n.free ? i : -1)).filter((i) => i >= 0)
        : [sharedIndex];
      return {
        label: isYou ? "You" : m.firstName,
        isYou,
        freeIndices,
      };
    });
  }, [overlap, me?.user?.id, myWeek, sharedIndex]);

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
  const names = others.map((m) => m.firstName).join(" and ");
  const headline = overlap?.dateLabel?.replace(/,.*$/, " night") ?? "Overlap night";

  return (
    <Screen>
      {me?.pendingHangoutCheck ? (
        <HangoutBanner
          label={me.pendingHangoutCheck.label}
          onYes={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, true)}
          onNo={() => api.hangoutCheck(me.pendingHangoutCheck!.overlapId, false)}
        />
      ) : null}
      <Eyebrow lamp>Overlap</Eyebrow>
      <Headline>{headline}</Headline>
      <Sub>
        You{names ? `, ${names}` : ""} are all free. Nobody had to ask.
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
