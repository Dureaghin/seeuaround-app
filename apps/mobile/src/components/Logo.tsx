import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from "react-native-svg";
import { colors, fonts } from "../lib/theme";

export function BrandIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.176, overflow: "hidden" }}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <SvgGradient id="lampGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FBDC9C" />
            <Stop offset="55%" stopColor="#F3C267" />
            <Stop offset="100%" stopColor="#E2A337" />
          </SvgGradient>
        </Defs>
        <Rect width={512} height={512} fill={colors.surface} />
        <Rect x={266} y={112} width={114} height={136} rx={20} fill="#2E333B" />
        <Rect x={132} y={264} width={114} height={136} rx={20} fill="#2E333B" />
        <Rect x={132} y={112} width={114} height={136} rx={20} fill="url(#lampGrad)" />
        <Rect x={266} y={264} width={114} height={136} rx={20} fill="url(#lampGrad)" />
      </Svg>
    </View>
  );
}

export function BrandLockup({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.lockup, compact && styles.lockupCompact]}>
      <BrandIcon size={compact ? 28 : 32} />
      <Text style={[styles.mark, compact && styles.markCompact]}>
        see<Text style={styles.litU}>u</Text>around
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    marginBottom: 28,
  },
  lockupCompact: { marginBottom: 20 },
  mark: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -1.04,
    color: colors.chalk,
  },
  markCompact: { fontSize: 22 },
  litU: {
    color: colors.lamp,
    textShadowColor: "rgba(243,194,103,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});
