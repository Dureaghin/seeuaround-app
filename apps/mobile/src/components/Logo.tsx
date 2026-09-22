import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors, fonts } from "../lib/theme";

/* Same mark as the site's icon.svg: two lit squares on night. */
export function BrandIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, overflow: "hidden" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect width={100} height={100} fill={colors.night} />
        <Rect x={19.75} y={19.75} width={27.75} height={27.75} rx={7.22} fill={colors.lamp} />
        <Rect x={52.5} y={52.5} width={27.75} height={27.75} rx={7.22} fill={colors.lamp} />
      </Svg>
    </View>
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
