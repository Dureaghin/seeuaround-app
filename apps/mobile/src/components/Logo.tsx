import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors, fonts } from "../lib/theme";

const LOGO_CSS =
  "@keyframes sua-logo{0%,100%{box-shadow:0 0 8px rgba(223,139,50,.16)}50%{box-shadow:0 0 14px rgba(223,139,50,.28)}}";

function ensureLogoPulse() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  let style = document.getElementById("sua-logo");
  if (!style) {
    style = document.createElement("style");
    style.id = "sua-logo";
    document.head.appendChild(style);
  }
  if (style.textContent !== LOGO_CSS) style.textContent = LOGO_CSS;
}

const logoPulse =
  Platform.OS === "web"
    ? ({
        animationName: "sua-logo",
        animationDuration: "2.8s",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      } as object)
    : null;

/* Same mark as the site's icon.svg: two lit squares on night. */
export function BrandIcon({ size = 32 }: { size?: number }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ensureLogoPulse();
    if (Platform.OS === "web") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const radius = size * 0.22;
  const shell = { width: size, height: size, borderRadius: radius };
  const mark = (
    <View style={[shell, { overflow: "hidden" }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect width={100} height={100} fill={colors.night} />
        <Rect x={19.75} y={19.75} width={27.75} height={27.75} rx={7.22} fill={colors.lamp} />
        <Rect x={52.5} y={52.5} width={27.75} height={27.75} rx={7.22} fill={colors.lamp} />
      </Svg>
    </View>
  );

  if (Platform.OS === "web") {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return (
      <View
        style={[
          shell,
          reduce
            ? { boxShadow: "0 0 10px rgba(223,139,50,.2)" }
            : logoPulse,
        ]}
      >
        {mark}
      </View>
    );
  }

  const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [6, 12] });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.28] });

  return (
    <Animated.View
      style={[
        shell,
        {
          shadowColor: colors.lamp,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius,
          shadowOpacity,
        },
      ]}
    >
      {mark}
    </Animated.View>
  );
}

export function BrandLockup({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.lockup}>
        <BrandIcon size={compact ? 26 : 30} />
        <Text style={[styles.mark, compact && styles.markCompact]}>seeuaround</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: 28 },
  wrapCompact: { marginBottom: 20 },
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mark: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.72,
    color: colors.chalk,
  },
  markCompact: { fontSize: 20, letterSpacing: -0.6 },
});
