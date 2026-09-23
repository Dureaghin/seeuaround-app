import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../src/context/AppContext";
import { colors } from "../src/lib/theme";

export default function LockScreen() {
  const router = useRouter();
  const { me, refresh } = useApp();
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    (async () => {
      const state = me ?? (await refresh());
      booted.current = true;
      if (state?.unansweredOverlapId) {
        router.replace(`/overlap/${state.unansweredOverlapId}`);
        return;
      }
      if (state?.activeThreadId) {
        router.replace(`/thread/${state.activeThreadId}`);
        return;
      }
      router.replace("/people");
    })();
  }, [me, refresh, router]);

  return (
    <View style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.lamp} size="large" />
    </View>
  );
}
