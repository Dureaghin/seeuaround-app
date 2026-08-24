import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../src/context/AppContext";
import { getToken } from "../src/lib/auth-store";
import { routeToPath, pathFromNotification } from "../src/lib/resolveRoute";
import { setupPushListeners, registerForPush } from "../src/lib/push";
import { colors } from "../src/lib/theme";
import * as Notifications from "expo-notifications";

export default function Index() {
  const router = useRouter();
  const { me, loading, refresh } = useApp();

  useEffect(() => {
    const cleanup = setupPushListeners((path) => router.replace(path as never));
    return cleanup;
  }, [router]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/email");
        return;
      }

      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        const path = pathFromNotification(
          last.notification.request.content.data as Record<string, unknown>,
        );
        if (path) {
          router.replace(path as never);
          await registerForPush();
          return;
        }
      }

      const state = me ?? (await refresh());
      if (!state) {
        router.replace("/(auth)/email");
        return;
      }

      await registerForPush();
      router.replace(routeToPath(state) as never);
    })();
  }, [loading, me, refresh, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.lamp} size="large" />
    </View>
  );
}
