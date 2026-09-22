import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";

/**
 * Same ground as the marketing site hero: night base, the warm ambient
 * photograph, a soft lamp wash from the lower-left, a vignette, and a
 * whisper of film grain. Sit once behind the whole app — screens stay
 * transparent so the light reads through.
 */
export function AmbientBackground() {
  return (
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden>
      <View style={[StyleSheet.absoluteFill, styles.base]} />
      <Image
        source={require("../../assets/hero-ambient.jpg")}
        style={styles.photo}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          "rgba(223,139,50,0.26)",
          "rgba(158,83,20,0.10)",
          "transparent",
        ]}
        locations={[0, 0.4, 0.7]}
        start={{ x: 0.1, y: 0.92 }}
        end={{ x: 0.8, y: 0.15 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Quiet the upper half so headlines and type sit on calmer ground. */}
      <LinearGradient
        colors={["rgba(9,8,7,0.55)", "rgba(9,8,7,0.22)", "rgba(9,8,7,0.38)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require("../../assets/grain.png")}
        style={styles.grain}
        resizeMode="repeat"
      />
    </View>
  );
}

const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: "100%" as const,
  height: "100%" as const,
};

const styles = StyleSheet.create({
  root: {
    ...fill,
    backgroundColor: colors.night,
    overflow: "hidden",
    zIndex: 0,
  },
  base: {
    backgroundColor: colors.night,
  },
  photo: {
    ...fill,
    opacity: 0.78,
  },
  grain: {
    ...fill,
    opacity: 0.028,
  },
});
