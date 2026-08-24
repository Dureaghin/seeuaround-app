import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BrandLockup } from "./Logo";
import { TAB_BAR_HEIGHT } from "./AppTabBar";
import { colors, fonts, radius, spacing } from "../lib/theme";

export function Screen({
  children,
  showLogo = true,
  bare = false,
}: {
  children: React.ReactNode;
  showLogo?: boolean;
  bare?: boolean;
}) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const inTabs = segments[0] === "(tabs)";
  const paddingBottom = inTabs
    ? TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.screenBottom)
    : spacing.screenBottom;

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={[
        bare ? styles.bareContent : styles.screenContent,
        { paddingBottom },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {showLogo && !bare ? <BrandLockup /> : null}
      {children}
    </ScrollView>
  );
}

export function Spacer() {
  return <View style={styles.spacer} />;
}

export function Eyebrow({ children, lamp }: { children: React.ReactNode; lamp?: boolean }) {
  return <Text style={[styles.eyebrow, lamp && styles.eyebrowLamp]}>{children}</Text>;
}

export function Headline({ children }: { children: React.ReactNode }) {
  return <Text style={styles.headline}>{children}</Text>;
}

export function Sub({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function SmallPrint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.smallprint}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "solid",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        (disabled || loading || pressed) && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "solid" ? colors.ink : colors.chalk} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === "ghost" && styles.btnTextGhost,
            variant === "danger" && styles.btnTextDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Actions({ row, children }: { row?: boolean; children: React.ReactNode }) {
  return <View style={[styles.actions, row && styles.actionsRow]}>{children}</View>;
}

export function TextField(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "characters";
  maxLength?: number;
  style?: object;
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.muted}
      style={[styles.tinput, props.style]}
    />
  );
}

export function OtpInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const refs = useRef<(TextInputType | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function updateAt(index: number, char: string) {
    const next = digits.map((d, i) => (i === index ? char : d === " " ? "" : d));
    if (char && index < 5) refs.current[index + 1]?.focus();
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
  }

  function onKey(index: number, key: string) {
    if (key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={[styles.otp, error && styles.otpBad]}>
      {digits.map((d, i) => (
        <View key={i} style={styles.otpCellWrap}>
          <TextInput
            ref={(r) => {
              refs.current[i] = r;
            }}
            value={d.trim()}
            onChangeText={(t) => {
              const cleaned = t.replace(/\D/g, "");
              if (cleaned.length > 1) {
                onChange(cleaned.slice(0, 6));
                refs.current[Math.min(cleaned.length, 5)]?.focus();
                return;
              }
              updateAt(i, cleaned.slice(-1));
            }}
            onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? 6 : 1}
            style={[
              styles.otpCell,
              d.trim() && styles.otpFilled,
              focused === i && styles.otpFocused,
              error && styles.otpCellError,
            ]}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused((f) => (f === i ? null : f))}
            selectTextOnFocus
          />
        </View>
      ))}
    </View>
  );
}

export function Fineprint({
  title,
  items,
}: {
  title: string;
  items: { ok: boolean; text: string }[];
}) {
  return (
    <View style={styles.fineprint}>
      <Text style={styles.fineprintH}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.fineprintRow}>
          <Text style={[styles.fineprintIcon, !item.ok && styles.fineprintIconNo]}>
            {item.ok ? "✓" : "✕"}
          </Text>
          <Text style={styles.fineprintText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function OptIn({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.optin}>
      <View style={[styles.optinBox, checked && styles.optinBoxOn]}>
        {checked ? <Text style={styles.optinCheck}>✓</Text> : null}
      </View>
      <Text style={styles.optinText}>{label}</Text>
    </Pressable>
  );
}

export function DevCheck() {
  return (
    <View style={styles.devcheck}>
      <Text style={styles.devcheckH}>Device age check</Text>
      <View style={styles.devcheckRow}>
        <Text style={styles.devcheckK}>iOS Declared Age Range</Text>
        <Text style={styles.devcheckV}>18+ ✓</Text>
      </View>
      <Text style={styles.devcheckNote}>Answered on your phone. Nothing was sent anywhere.</Text>
    </View>
  );
}

export function Choice({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceOn]}>
      <Text style={[styles.choiceT, selected && styles.choiceTOn]}>{title}</Text>
      <Text style={styles.choiceD}>{description}</Text>
    </Pressable>
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
    <View style={styles.askbar}>
      <Text style={styles.askbarQ}>{label}</Text>
      <View style={styles.askbarB}>
        <Pressable onPress={onYes} style={styles.askbarY}>
          <Text style={styles.askbarYText}>Yes</Text>
        </Pressable>
        <Pressable onPress={onNo} style={styles.askbarN}>
          <Text style={styles.askbarNText}>Nope</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CodeCard({
  children,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  copied = false,
  onCopy,
}: {
  children: React.ReactNode;
  copyLabel?: string;
  copiedLabel?: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <View style={styles.codeCard}>
      {children}
      {onCopy ? (
        <Pressable
          onPress={onCopy}
          style={[styles.copy, copied && styles.copyCopied]}
          accessibilityRole="button"
          accessibilityLabel={copied ? copiedLabel : copyLabel}
          accessibilityState={{ disabled: copied }}
        >
          <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
            {copied ? copiedLabel : copyLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LinkRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.linkctlR}>
      <Text style={styles.linkctlK}>{label}</Text>
      <Text style={styles.linkctlV}>{value}</Text>
    </View>
  );
}

export function Pips({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <View>
      <View style={styles.pips}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.pip, i < filled && styles.pipOn]} />
        ))}
      </View>
      <Text style={styles.pipLabel}>
        {filled} of {total} joined
      </Text>
    </View>
  );
}

export function GroupHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.group}>{children}</Text>;
}

export function PersonRow({
  name,
  free,
  nudge,
  onNudge,
}: {
  name: string;
  free?: boolean;
  nudge?: boolean;
  onNudge?: () => void;
}) {
  return (
    <View style={styles.person}>
      <View style={[styles.dot, free && styles.dotFree]} />
      <Text style={[styles.personName, free ? styles.personNameFree : styles.personNameDim]}>
        {name}
      </Text>
      {nudge ? (
        <Pressable onPress={onNudge} style={styles.nudge}>
          <Text style={styles.nudgeText}>Nudge</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function NightStrip({
  nights,
  onToggle,
}: {
  nights: { label: string; free: boolean }[];
  onToggle: (index: number) => void;
}) {
  return (
    <View style={styles.strip}>
      {nights.map((night, i) => (
        <Pressable key={i} onPress={() => onToggle(i)} style={styles.night}>
          {night.free ? (
            <LinearGradient
              colors={[colors.lampGradStart, colors.lampGradEnd]}
              style={styles.paneLit}
            >
              <View style={styles.sashLit} />
              <View style={styles.sashLit} />
              <View style={styles.sashLit} />
            </LinearGradient>
          ) : (
            <View style={styles.pane}>
              <View style={styles.sash} />
              <View style={styles.sash} />
              <View style={styles.sash} />
            </View>
          )}
          <Text style={[styles.nightLabel, night.free && styles.nightLabelLit]}>{night.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function WeekTally({ count }: { count: number }) {
  const text =
    count === 0
      ? "No nights selected yet."
      : count === 1
        ? "One night lit."
        : `${count} nights lit.`;
  return (
    <Text style={styles.tally}>
      {text.split(/(\d+|One)/).map((part, i) =>
        /^\d+$|^One$/.test(part) ? (
          <Text key={i} style={styles.tallyBold}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

export function OverlapGrid({
  rows,
  axisLabels,
  sharedIndex,
}: {
  rows: { label: string; isYou?: boolean; freeIndices: number[] }[];
  axisLabels: string[];
  sharedIndex: number;
}) {
  return (
    <View>
      <View style={styles.overlapRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.overlapRow}>
            <Text style={[styles.who, row.isYou && styles.whoYou]}>{row.label}</Text>
            <View style={styles.cells}>
              {axisLabels.map((_, i) => {
                const on = row.freeIndices.includes(i);
                const shared = on && i === sharedIndex;
                return (
                  <View
                    key={i}
                    style={[styles.cell, on && styles.cellOn, shared && styles.cellShared]}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        {axisLabels.map((label, i) => (
          <Text key={i} style={[styles.axisLabel, i === sharedIndex && styles.axisHit]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function ThreadHeader({
  title,
  subtitle,
  countdown,
  countdownSub,
}: {
  title: string;
  subtitle: string;
  countdown: string;
  countdownSub?: string;
}) {
  return (
    <View style={styles.threadTop}>
      <View style={styles.threadTopL}>
        <Text style={styles.threadTitle}>{title}</Text>
        <Text style={styles.threadSub}>{subtitle}</Text>
      </View>
      <View>
        <Text style={styles.countdown}>{countdown}</Text>
        {countdownSub ? <Text style={styles.countdownSub}>{countdownSub}</Text> : null}
      </View>
    </View>
  );
}

export function PlanBar({ plan }: { plan: string }) {
  return (
    <View style={styles.plan}>
      <View style={styles.planBody}>
        <Text style={styles.planH}>The plan</Text>
        <Text style={styles.planV}>{plan}</Text>
      </View>
      <Pressable style={styles.planEdit}>
        <Text style={styles.planEditText}>Where?</Text>
      </Pressable>
    </View>
  );
}

export function MessageBubble({
  body,
  from,
  mine,
}: {
  body: string;
  from?: string;
  mine?: boolean;
}) {
  return (
    <View style={[styles.msg, mine ? styles.msgMe : styles.msgThem]}>
      {from && !mine ? <Text style={styles.msgFrom}>{from}</Text> : null}
      <Text style={[styles.msgBody, mine && styles.msgBodyMe]}>{body}</Text>
    </View>
  );
}

export function SysMessage({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sys}>{children}</Text>;
}

export function QuickChips({
  chips,
  onPress,
}: {
  chips: string[];
  onPress: (chip: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {chips.map((chip) => (
        <Pressable key={chip} onPress={() => onPress(chip)} style={styles.chip}>
          <Text style={styles.chipText}>{chip}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  ready,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  ready: boolean;
}) {
  return (
    <View style={styles.composer}>
      <View style={styles.mic}>
        <Text style={styles.micIcon}>🎤</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Message"
        placeholderTextColor={colors.dim}
        style={styles.composerField}
      />
      <Pressable
        onPress={onSend}
        disabled={!ready}
        style={[styles.send, ready && styles.sendReady]}
      >
        <Text style={[styles.sendIcon, ready && styles.sendIconReady]}>➤</Text>
      </Pressable>
    </View>
  );
}

export function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.quiet}>{label}</Text>
    </Pressable>
  );
}

export function Linkish({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.linkish}>{label}</Text>
    </Pressable>
  );
}

export function ErrText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.err}>{children}</Text>;
}

const styles = StyleSheet.create({
  screenScroll: { flex: 1, backgroundColor: colors.night },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenX,
    paddingTop: 36,
  },
  bareContent: {
    flexGrow: 1,
  },
  spacer: { flex: 1, minHeight: 18 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.68,
    textTransform: "uppercase",
    color: colors.dim,
  },
  eyebrowLamp: { color: colors.lamp },
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.84,
    color: colors.chalk,
    marginTop: 12,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.dim,
    marginTop: 11,
    maxWidth: 240,
  },
  smallprint: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.muted,
    marginTop: 17,
    lineHeight: 19,
    textAlign: "center",
  },
  btn: {
    width: "100%",
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: colors.lamp,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(224,110,90,0.35)",
  },
  btnPressed: { opacity: 0.88 },
  btnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  btnTextGhost: { color: colors.dim },
  btnTextDanger: { color: colors.danger },
  actions: { gap: 9, marginTop: 16 },
  actionsRow: { flexDirection: "row" },
  tinput: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: 17,
    paddingVertical: 16,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 16,
    marginTop: 24,
  },
  otp: {
    flexDirection: "row",
    gap: 8,
    marginTop: 26,
    width: "100%",
    alignSelf: "stretch",
  },
  otpBad: {},
  otpCellWrap: {
    flex: 1,
    minWidth: 0,
  },
  otpCell: {
    width: "100%",
    height: Platform.OS === "web" ? 52 : 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.chalk,
    fontFamily: fonts.mono,
    fontSize: 23,
    lineHeight: Platform.OS === "web" ? 52 : 56,
    textAlign: "center",
    paddingVertical: 0,
    ...(Platform.OS === "web"
      ? ({ outlineStyle: "none" } as object)
      : null),
  },
  otpFocused: {
    borderColor: colors.lamp,
    backgroundColor: "rgba(243,194,103,0.07)",
  },
  otpCellError: {
    borderColor: "rgba(224,110,90,0.65)",
  },
  otpFilled: { borderColor: "rgba(243,194,103,0.4)" },
  fineprint: {
    backgroundColor: colors.fineprintBg,
    borderRadius: 13,
    padding: 15,
    marginTop: 20,
  },
  fineprintH: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.33,
    textTransform: "uppercase",
    color: colors.dim,
    marginBottom: 9,
  },
  fineprintRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  fineprintIcon: { color: colors.lamp, fontSize: 12.5 },
  fineprintIconNo: { color: colors.muted },
  fineprintText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.dim,
  },
  optin: { flexDirection: "row", gap: 11, marginTop: 18, alignItems: "flex-start" },
  optinBox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  optinBoxOn: { backgroundColor: colors.lamp, borderColor: colors.lamp },
  optinCheck: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  optinText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.dim,
  },
  devcheck: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(243,194,103,0.30)",
    borderRadius: radius.lg,
    padding: 17,
    marginTop: 24,
  },
  devcheckH: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.33,
    textTransform: "uppercase",
    color: colors.dim,
    marginBottom: 12,
  },
  devcheckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  devcheckK: { fontFamily: fonts.body, fontSize: 14, color: colors.chalk, flex: 1 },
  devcheckV: { fontFamily: fonts.mono, fontSize: 13, color: colors.lamp },
  devcheckNote: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.dim,
    marginTop: 10,
    lineHeight: 18,
  },
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: 17,
    marginTop: 9,
  },
  choiceOn: {
    borderColor: colors.lamp,
    backgroundColor: "rgba(243,194,103,0.07)",
  },
  choiceT: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.chalk },
  choiceTOn: { color: colors.lamp },
  choiceD: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.dim,
    marginTop: 3,
    lineHeight: 18,
  },
  askbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: colors.lampTintBg,
    borderWidth: 1,
    borderColor: colors.lampTintBorder,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 18,
  },
  askbarQ: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.chalk, minWidth: 120 },
  askbarB: { flexDirection: "row", gap: 7 },
  askbarY: {
    backgroundColor: colors.lamp,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 15,
  },
  askbarYText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: colors.ink },
  askbarN: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 15,
  },
  askbarNText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: colors.dim },
  codeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 19,
    marginTop: 20,
  },
  copy: {
    alignSelf: "flex-start",
    marginTop: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  copyCopied: {
    borderColor: colors.lamp,
    backgroundColor: "rgba(243,194,103,0.07)",
  },
  copyText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.05,
    textTransform: "uppercase",
    color: colors.chalk,
  },
  copyTextCopied: {
    color: colors.lamp,
  },
  linkctlR: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkctlK: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim },
  linkctlV: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.chalk,
    textAlign: "right",
    flexShrink: 1,
  },
  pips: { flexDirection: "row", gap: 8, marginTop: 24 },
  pip: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.pane },
  pipOn: { backgroundColor: colors.lamp },
  pipLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
    marginTop: 11,
  },
  group: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.47,
    textTransform: "uppercase",
    color: colors.dim,
    marginTop: 24,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  person: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pane },
  dotFree: {
    backgroundColor: colors.lamp,
    ...Platform.select({
      web: { boxShadow: "0 0 5.5px rgba(243,194,103,0.75)" },
      default: {
        shadowColor: colors.lamp,
        shadowOpacity: 0.75,
        shadowRadius: 5.5,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  personName: { flex: 1, fontFamily: fonts.body, fontSize: 14.5 },
  personNameFree: { color: colors.chalk },
  personNameDim: { color: colors.dim },
  nudge: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  nudgeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.dim,
  },
  strip: { flexDirection: "row", gap: 8, marginTop: 28, height: 244 },
  night: { flex: 1, gap: 7, flexDirection: "column" },
  pane: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: colors.pane,
    borderWidth: 1,
    borderColor: "rgba(232,230,225,0.05)",
    justifyContent: "space-evenly",
    paddingVertical: 9,
    paddingHorizontal: 5,
  },
  paneLit: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,233,184,0.55)",
    justifyContent: "space-evenly",
    paddingVertical: 9,
    paddingHorizontal: 5,
    ...Platform.select({
      web: { boxShadow: "0 0 11px rgba(243,194,103,0.3)" },
      default: {
        shadowColor: colors.lamp,
        shadowOpacity: 0.3,
        shadowRadius: 11,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  sash: { height: 1, backgroundColor: "rgba(232,230,225,0.06)" },
  sashLit: { height: 1, backgroundColor: "rgba(58,38,4,0.22)" },
  nightLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
    textAlign: "center",
  },
  nightLabelLit: { color: colors.lamp },
  tally: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.dim,
    marginTop: 17,
    lineHeight: 20,
  },
  tallyBold: { color: colors.chalk, fontFamily: fonts.monoMedium },
  overlapRows: { marginTop: 24, gap: 13, flexDirection: "column" },
  overlapRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  who: { width: 52, fontFamily: fonts.body, fontSize: 13, color: colors.dim },
  whoYou: { color: colors.chalk },
  cells: { flex: 1, flexDirection: "row", gap: 5 },
  cell: { flex: 1, height: 34, borderRadius: 6, backgroundColor: colors.pane },
  cellOn: { backgroundColor: colors.lamp, opacity: 0.4 },
  cellShared: { backgroundColor: colors.lampHot, opacity: 1 },
  axis: { flexDirection: "row", gap: 5, marginLeft: 65, marginTop: 9 },
  axisLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.dim,
  },
  axisHit: { color: colors.lampHot },
  threadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  threadTopL: { flex: 1 },
  threadTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.chalk },
  threadSub: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginTop: 2 },
  countdown: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.lamp,
    textAlign: "right",
  },
  countdownSub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.muted,
    marginTop: 3,
    letterSpacing: 0.36,
    textAlign: "right",
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    backgroundColor: colors.lampTintBg,
    borderWidth: 1,
    borderColor: colors.lampTintBorder,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  planBody: { flex: 1 },
  planH: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.26,
    textTransform: "uppercase",
    color: colors.dim,
  },
  planV: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.chalk, marginTop: 4 },
  planEdit: {
    borderWidth: 1,
    borderColor: "rgba(243,194,103,0.35)",
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  planEditText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  msg: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 17,
    marginTop: 4,
  },
  msgThem: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface2,
    borderBottomLeftRadius: 6,
  },
  msgMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.lamp,
    borderBottomRightRadius: 6,
  },
  msgFrom: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, marginBottom: 4 },
  msgBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.chalk },
  msgBodyMe: { color: colors.ink },
  sys: {
    textAlign: "center",
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.muted,
    paddingVertical: 9,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.chalk },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.composer,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  mic: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { fontSize: 14 },
  composerField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.chalk,
    paddingVertical: 9,
    paddingHorizontal: 2,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.pane,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReady: { backgroundColor: colors.lamp },
  sendIcon: { color: colors.chalk, fontSize: 14 },
  sendIconReady: { color: colors.ink },
  quiet: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 12,
  },
  linkish: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.lamp,
    textDecorationLine: "underline",
  },
  err: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: 14 },
  quiethours: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 17,
  },
  later: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 18,
    lineHeight: 19,
  },
  sentto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dim,
    marginTop: 11,
    lineHeight: 22,
  },
  senttoBold: { color: colors.chalk, fontFamily: fonts.bodyMedium },
  resend: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.muted,
    marginTop: 20,
    textAlign: "center",
  },
  expiry: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
    marginTop: 24,
  },
  codelinkH: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 23, color: colors.dim },
  codelinkT: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 23, color: colors.lamp },
  codeMono: {
    fontFamily: fonts.mono,
    fontSize: 24,
    letterSpacing: 1.2,
    color: colors.lamp,
  },
  linkctlKill: {
    width: "100%",
    marginTop: 13,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(224,110,90,0.35)",
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
  },
  linkctlKillText: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});

// Re-export style helpers used inline in screens
export { styles as uiStyles };
