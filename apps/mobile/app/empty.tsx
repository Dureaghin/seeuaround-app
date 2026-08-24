import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import {
  Button,
  Eyebrow,
  GroupHeader,
  Headline,
  PersonRow,
  Screen,
  Spacer,
  Sub,
} from "../src/components/ui";

export default function EmptyScreen() {
  const router = useRouter();
  const [missing, setMissing] = useState<{ id: string; firstName: string }[]>([]);
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .getConnections()
      .then((r) => {
        setMissing(
          r.connections
            .filter((c) => c.status === "accepted" && !c.weekSet)
            .map((c) => ({ id: c.id, firstName: c.firstName })),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <Screen>
      <Eyebrow>Wednesday</Eyebrow>
      <Headline>Nothing lines up this week.</Headline>
      <Sub>
        {missing.length > 0
          ? `${missing.length} of your people haven't set their week yet. That's usually why.`
          : "Nobody's nights overlap yet. Give it until Sunday evening."}
      </Sub>

      {missing.length > 0 ? (
        <>
          <GroupHeader>Hasn't set a week — {missing.length}</GroupHeader>
          {missing.map((p) => (
            <PersonRow
              key={p.id}
              name={p.firstName}
              nudge
              nudged={nudged.has(p.id)}
              onNudge={() => setNudged((prev) => new Set(prev).add(p.id))}
            />
          ))}
        </>
      ) : null}

      <Spacer />
      <Button label="Add someone new" onPress={() => router.push("/invite")} variant="ghost" />
    </Screen>
  );
}
