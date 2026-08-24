import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandIcon } from "../src/components/Logo";
import { Button, Screen, Spacer } from "../src/components/ui";
import { colors, fonts } from "../src/lib/theme";

function PushCard({
  body,
  when,
  dim,
}: {
  body: string;
  when: string;
  dim?: boolean;
}) {
  return (
    <View style={[styles.push, dim && styles.pushDim]}>
      <BrandIcon size={34} />
      <View style={styles.pushBody}>
        <View style={styles.pushTop}>
          <Text style={styles.pushApp}>See U Around</Text>
          <Text style={styles.pushWhen}>{when}</Text>
        </View>
        <Text style={styles.pushText}>{body}</Text>
      </View>
    </View>
  );
}

export default function LockScreen() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Screen bare showLogo={false}>
      <Text style={styles.lockTime}>{timeStr}</Text>
      <Text style={styles.lockDate}>{dateStr}</Text>

      <View style={styles.pushes}>
        <PushCard when="now" body="Tonight. You, Sam and Marco are all free." />
        <PushCard when="Sun" body="Which nights are you free this week?" dim />
      </View>

      <Spacer />
      <View style={styles.ctaWrap}>
        <Button label="Open the top one" onPress={() => router.push("/people")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lockTime: {
    fontFamily: fonts.displayMedium,
    fontSize: 74,
    letterSpacing: -2.96,
    textAlign: "center",
    marginTop: 96,
    color: colors.chalk,
    lineHeight: 74,
  },
  lockDate: {
    textAlign: "center",
    fontSize: 14,
    color: colors.dim,
    marginTop: 8,
    fontFamily: fonts.body,
  },
  pushes: { marginTop: 52, paddingHorizontal: 18, gap: 10 },
  push: {
    backgroundColor: colors.pushBg,
    borderRadius: 19,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    gap: 12,
  },
  pushDim: { opacity: 0.5 },
  pushBody: { flex: 1, minWidth: 0 },
  pushTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  pushApp: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.dim,
  },
  pushWhen: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim },
  pushText: { fontSize: 14, lineHeight: 20, color: colors.chalk, marginTop: 5, fontFamily: fonts.body },
  ctaWrap: { paddingHorizontal: 26, paddingBottom: 8 },
});
