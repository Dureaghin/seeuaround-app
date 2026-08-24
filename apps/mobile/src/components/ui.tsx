import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing } from "../lib/theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        (disabled || loading || pressed) && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.night : colors.chalk} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant !== "primary" && styles.buttonTextGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "characters";
  maxLength?: number;
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.dim}
      style={styles.input}
    />
  );
}

export function HangoutBanner({
  label,
  onYes,
  onNo,
}: {
  label: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{label}</Text>
      <View style={styles.bannerRow}>
        <Pressable onPress={onYes} style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>Yes</Text>
        </Pressable>
        <Pressable onPress={onNo} style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
    paddingHorizontal: spacing.lg,
    paddingTop: 72,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.chalk,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.dim,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.lamp,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: colors.night,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextGhost: { color: colors.chalk },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.chalk,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  banner: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bannerText: { color: colors.chalk, marginBottom: spacing.sm },
  bannerRow: { flexDirection: "row", gap: spacing.sm },
  bannerBtn: {
    flex: 1,
    backgroundColor: colors.pane,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  bannerBtnText: { color: colors.lamp, fontWeight: "600" },
});
