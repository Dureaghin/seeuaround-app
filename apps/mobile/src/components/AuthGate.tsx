import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import { useApp } from "../context/AppContext";
import { isPublicRoute } from "../lib/auth-gate";
import { getToken } from "../lib/auth-store";
import {
  normalizeFriendCode,
  resolveFriendCodeParam,
} from "../lib/friend-code";
import { colors } from "../lib/theme";

/**
 * Blocks protected screens until a session exists.
 * Anonymous deep links to /invite, /people, etc. go to sign-in.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const params = useGlobalSearchParams<{ code?: string | string[] }>();
  const { loading, me } = useApp();
  const [allowed, setAllowed] = useState(false);

  const publicRoute = isPublicRoute(segments as string[]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (publicRoute) {
        if (!cancelled) setAllowed(true);
        return;
      }

      // Wait for AppContext bootstrap so we don't race a cold start.
      if (loading) {
        if (!cancelled) setAllowed(false);
        return;
      }

      const token = await getToken();
      if (cancelled) return;

      // Token only — don't require `me` (network blips shouldn't force sign-in).
      // `me` in deps still re-runs after 401 clears the session.
      if (!token) {
        setAllowed(false);
        const friendCode = resolveFriendCodeParam(params.code);
        if (segments[0] === "add-code" && friendCode) {
          router.replace({
            pathname: "/(auth)/email",
            params: { friendCode: normalizeFriendCode(friendCode) },
          });
        } else {
          router.replace("/(auth)/email");
        }
        return;
      }

      setAllowed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [publicRoute, loading, me, segments, params.code, router]);

  if (publicRoute) return <>{children}</>;

  if (!allowed) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.night,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.lamp} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
