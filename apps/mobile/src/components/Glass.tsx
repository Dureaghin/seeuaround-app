import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius as themeRadius } from "../lib/theme";

type GlassProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Blur strength. Higher = more frosted. */
  intensity?: number;
  radius?: number;
  /** Slightly warmer wash — good for elevated cards. */
  warm?: boolean;
};

/**
 * Liquid-glass panel: frosted blur + warm tint + a soft specular rim.
 * Keeps the nostalgic lamp palette while borrowing Apple’s material depth.
 */
export function Glass({
  children,
  style,
  contentStyle,
  intensity = 36,
  radius = themeRadius.xl,
  warm = false,
}: GlassProps) {
  return (
    <View style={[styles.shell, { borderRadius: radius }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          warm ? styles.washWarm : styles.wash,
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,247,235,0.22)",
          "rgba(255,247,235,0.06)",
          "transparent",
        ]}
        locations={[0, 0.12, 0.42]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.rim, { borderRadius: radius }]}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: Platform.OS === "web" ? "rgba(20,18,16,0.18)" : "transparent",
    // Web fallback when BlurView is thin — still reads as glass.
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(36px) saturate(160%)",
          WebkitBackdropFilter: "blur(36px) saturate(160%)",
        } as object)
      : null),
  },
  wash: {
    backgroundColor: "rgba(14,12,11,0.28)",
  },
  washWarm: {
    backgroundColor: "rgba(32,22,12,0.32)",
  },
  rim: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.glassBorder,
  },
  content: {
    position: "relative",
  },
});
