import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
  type TextInputProps,
} from "react-native";
import { useSegments, useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle, Path } from "react-native-svg";
import { AmbientBackground } from "./AmbientBackground";
import { BrandLockup } from "./Logo";
import { TAB_BAR_HEIGHT } from "./AppTabBar";
import { colors, fonts, radius, spacing } from "../lib/theme";

export function Screen({
  children,
  showLogo = false,
  bare = false,
  header,
  footer,
  scrollRef,
}: {
  children: React.ReactNode;
  showLogo?: boolean;
  bare?: boolean;
  /** Stays at the top. Pass a function to draw a shorter bar once the thread scrolls. */
  header?: React.ReactNode | ((compact: boolean) => React.ReactNode);
  /** Stays at the bottom of the window. The rest of the screen scrolls under it. */
  footer?: React.ReactNode;
  scrollRef?: React.Ref<ScrollView>;
}) {
  const segments = useSegments();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerCompact, setHeaderCompact] = useState(false);
  const inTabs = segments[0] === "(tabs)";
  const paddingBottom = footer
    ? footerHeight + 12
    : inTabs
      ? TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.screenBottom)
      : spacing.screenBottom;

  // Inactive tab scenes stay mounted on web and stack under the active one.
  // An empty opaque shell stops their type from bleeding through transparent scroll areas.
  if (!focused) {
    return <View style={styles.screenRoot} />;
  }

  return (
    <View style={styles.screenRoot}>
      <AmbientBackground />
      {header ? (
        <View style={[styles.screenHead, headerCompact && styles.screenHeadCompact]}>
          {typeof header === "function" ? header(headerCompact) : header}
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        onScroll={(event) => {
          if (!header) return;
          const next = event.nativeEvent.contentOffset.y > 24;
          setHeaderCompact((current) => (current === next ? current : next));
        }}
        style={styles.screenScroll}
        contentContainerStyle={[
          bare ? styles.bareContent : styles.screenContent,
          { paddingBottom, paddingTop: header ? 12 : undefined },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {showLogo && !bare ? <BrandLockup /> : null}
        {children}
      </ScrollView>
      {footer ? (
        <View
          onLayout={(event) => {
            const next = Math.ceil(event.nativeEvent.layout.height);
            setFooterHeight((height) => (height === next ? height : next));
          }}
          style={[
            styles.screenDock,
            {
              paddingBottom: Math.max(insets.bottom, 8),
              position: Platform.OS === "web" ? "fixed" : "absolute",
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function Spacer() {
  return <View style={styles.spacer} />;
}

export function Eyebrow({ children, lamp }: { children: React.ReactNode; lamp?: boolean }) {
  return <Text style={[styles.eyebrow, lamp && styles.eyebrowLamp]}>{children}</Text>;
}

export function Headline({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.headline, style]}>{children}</Text>;
}

export function Sub({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.sub, style]}>{children}</Text>;
}

export function SmallPrint({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.smallprint, style]}>{children}</Text>;
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
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        disabled && !loading && variant === "solid" && styles.btnDisabled,
        disabled && !loading && variant !== "solid" && styles.btnDisabledSoft,
        !disabled && (loading || pressed) && styles.btnPressed,
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
            disabled && styles.btnTextDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Actions({
  row,
  style,
  children,
}: {
  row?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  return <View style={[styles.actions, row && styles.actionsRow, style]}>{children}</View>;
}

/** Solid panel over the ambient ground — use for lists, meta, and dense type. */
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export const TextField = forwardRef<TextInputType, TextInputProps>(function TextField(
  { style, placeholderTextColor, autoCorrect, spellCheck, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      autoCorrect={autoCorrect ?? false}
      spellCheck={spellCheck ?? false}
      {...props}
      style={[styles.tinput, style]}
    />
  );
});

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
  style,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[styles.optin, style]}
    >
      <View style={[styles.optinBox, checked && styles.optinBoxOn]} accessibilityElementsHidden>
        {checked ? <Text style={styles.optinCheck}>✓</Text> : null}
      </View>
      <Text style={styles.optinText}>{label}</Text>
    </Pressable>
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

export function Mutual({
  title,
  items,
}: {
  title: string;
  items: { ok: boolean; text: string }[];
}) {
  return (
    <View style={styles.mutual}>
      <Text style={styles.mutualH}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.mutualRow}>
          <Text style={[styles.mutualIcon, !item.ok && styles.mutualIconNo]}>
            {item.ok ? "✓" : "✕"}
          </Text>
          <Text style={styles.mutualText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function HangoutBanner({
  label,
  onYes,
  onNo,
}: {
  label: string;
  onYes: () => void | Promise<void>;
  onNo: () => void | Promise<void>;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Text style={styles.askbarDone}>Thanks — that's the only number we care about.</Text>
    );
  }

  async function answer(fn: () => void | Promise<void>) {
    await fn();
    setDone(true);
  }

  return (
    <View style={styles.askbar}>
      <Text style={styles.askbarQ}>{label}</Text>
      <View style={styles.askbarB}>
        <Pressable onPress={() => answer(onYes)} style={styles.askbarY}>
          <Text style={styles.askbarYText}>Yes</Text>
        </Pressable>
        <Pressable onPress={() => answer(onNo)} style={styles.askbarN}>
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
  qrValue,
}: {
  children: React.ReactNode;
  copyLabel?: string;
  copiedLabel?: string;
  copied?: boolean;
  onCopy?: () => void;
  /** When set, a scannable QR sits beside the code (e.g. deep link to add-by-code). */
  qrValue?: string;
}) {
  return (
    <View style={styles.codeCard}>
      <View style={styles.codeCardRow}>
        {qrValue ? (
          <View style={styles.qrPad} accessibilityLabel="QR code for this invite code">
            <QRCode
              value={qrValue}
              size={84}
              color={colors.ink}
              backgroundColor={colors.chalk}
              ecl="M"
            />
          </View>
        ) : null}
        <View style={styles.codeCardBody}>
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
      </View>
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
  nudged,
  onNudge,
  onBlock,
}: {
  name: string;
  free?: boolean;
  nudge?: boolean;
  nudged?: boolean;
  onNudge?: () => void;
  onBlock?: () => void;
}) {
  return (
    <View style={styles.person}>
      <View style={[styles.dot, free && styles.dotFree]} />
      <Text style={[styles.personName, free ? styles.personNameFree : styles.personNameDim]}>
        {name}
      </Text>
      {onBlock ? (
        <Pressable
          onPress={onBlock}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Block ${name}`}
        >
          <Text style={styles.removeText}>Block</Text>
        </Pressable>
      ) : null}
      {nudge ? (
        <Pressable
          onPress={onNudge}
          disabled={nudged}
          style={[styles.nudge, nudged && styles.nudgeDone]}
        >
          <Text style={[styles.nudgeText, nudged && styles.nudgeTextDone]}>
            {nudged ? "Nudged" : "Nudge"}
          </Text>
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
        <Pressable
          key={i}
          onPress={() => onToggle(i)}
          style={styles.night}
          accessibilityRole="button"
          accessibilityLabel={night.label}
          accessibilityState={{ selected: night.free }}
        >
          {night.free ? (
            <LinearGradient
              colors={[colors.lampGradStart, colors.lampGradEnd]}
              style={styles.paneLit}
            />
          ) : (
            <View style={styles.pane} />
          )}
          <Text style={[styles.nightLabel, night.free && styles.nightLabelLit]}>{night.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function WeekTally({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Text style={styles.tally}>
        <Text style={styles.tallyBold}>Nobody</Text> can find you this week.
      </Text>
    );
  }
  const nightsLabel = count === 1 ? "One night" : `${count} nights`;
  return (
    <Text style={styles.tally}>
      <Text style={styles.tallyBold}>{nightsLabel}</Text> lit
    </Text>
  );
}

/** Prototype `.cell.shared`: a 3s glow, brighter at mid-cycle. */
const BREATHE_CSS =
  "@keyframes sua-breathe{0%,100%{box-shadow:0 0 14px rgba(255,233,184,.35)}50%{box-shadow:0 0 26px rgba(255,233,184,.72)}}@keyframes sua-mic{0%,100%{box-shadow:0 0 0 0 rgba(243,194,103,.5)}50%{box-shadow:0 0 0 9px rgba(243,194,103,0)}}";

function ensureBreathe() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  let style = document.getElementById("sua-breathe");
  if (!style) {
    style = document.createElement("style");
    style.id = "sua-breathe";
    document.head.appendChild(style);
  }
  if (style.textContent !== BREATHE_CSS) style.textContent = BREATHE_CSS;
}

const cellBreathe =
  Platform.OS === "web"
    ? ({
        animationName: "sua-breathe",
        animationDuration: "3s",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      } as object)
    : null;

function SharedNight() {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  if (Platform.OS === "web") {
    ensureBreathe();
    return <View style={[styles.cell, styles.cellShared, cellBreathe]} />;
  }

  const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [14, 26] });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.72] });
  return (
    <Animated.View
      style={[
        styles.cell,
        styles.cellShared,
        {
          shadowColor: "#FFE9B8",
          shadowOffset: { width: 0, height: 0 },
          shadowRadius,
          shadowOpacity,
        },
      ]}
    />
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
                if (shared) return <SharedNight key={i} />;
                return <View key={i} style={[styles.cell, on && styles.cellOn]} />;
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
  onClose,
}: {
  title: string;
  subtitle: string;
  countdown: string;
  countdownSub?: string;
  onClose?: () => void;
}) {
  return (
    <View style={styles.threadTop}>
      <View style={styles.threadTopL}>
        <Text style={styles.threadTitle}>{title}</Text>
        <Text style={styles.threadSub}>{subtitle}</Text>
      </View>
      <View style={styles.threadTopR}>
        <View>
          <Text style={styles.countdown}>{countdown}</Text>
          {countdownSub ? <Text style={styles.countdownSub}>{countdownSub}</Text> : null}
        </View>
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.threadClose}
          >
            <Text style={styles.threadCloseMark}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PlanBar({
  when,
  place,
  onWherePress,
  directionsUrl,
}: {
  when: string;
  place: string;
  onWherePress?: () => void;
  directionsUrl?: string;
}) {
  return (
    <View style={styles.plan}>
      <View style={styles.planBody}>
        <Text style={styles.planH}>The plan</Text>
        <Text style={styles.planV}>{when}</Text>
        <Text style={styles.planPlace} numberOfLines={2}>
          {place}
        </Text>
      </View>
      {directionsUrl ? (
        <Pressable
          accessibilityLabel="Directions"
          style={styles.planDir}
          onPress={() => {
            Linking.openURL(directionsUrl).catch(() => {});
          }}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"
              fill="none"
              stroke={colors.lamp}
              strokeWidth={1.6}
            />
            <Circle cx={12} cy={10} r={2.6} fill="none" stroke={colors.lamp} strokeWidth={1.6} />
          </Svg>
        </Pressable>
      ) : null}
      <Pressable
        style={styles.planEdit}
        onPress={onWherePress}
        accessibilityLabel="Where"
      >
        <Text style={styles.planEditText}>Where</Text>
      </Pressable>
    </View>
  );
}

export function CompactThreadBar({
  title,
  when,
  place,
  onWherePress,
  onClose,
  directionsUrl,
}: {
  title: string;
  when: string;
  place: string;
  onWherePress?: () => void;
  onClose?: () => void;
  directionsUrl?: string;
}) {
  return (
    <View style={styles.compactBar}>
      <View style={styles.planBody}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.compactPlan} numberOfLines={1}>
          {when}
        </Text>
        <Text style={styles.compactPlace} numberOfLines={1}>
          {place}
        </Text>
      </View>
      {directionsUrl ? (
        <Pressable
          accessibilityLabel="Directions"
          style={styles.planDir}
          onPress={() => {
            Linking.openURL(directionsUrl).catch(() => {});
          }}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"
              fill="none"
              stroke={colors.lamp}
              strokeWidth={1.6}
            />
            <Circle cx={12} cy={10} r={2.6} fill="none" stroke={colors.lamp} strokeWidth={1.6} />
          </Svg>
        </Pressable>
      ) : null}
      <Pressable style={styles.planEdit} onPress={onWherePress} accessibilityLabel="Where">
        <Text style={styles.planEditText}>Where</Text>
      </Pressable>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.threadClose}
        >
          <Text style={styles.threadCloseMark}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type PlaceVote = { name: string; votes: number; mine: boolean };
type PlaceHit = { name: string; subtitle: string };

function uniquePlaces(list: PlaceHit[]): PlaceHit[] {
  const seen = new Set<string>();
  const out: PlaceHit[] = [];
  for (const place of list) {
    const key = place.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...place, name: place.name.trim() });
  }
  return out;
}

function PlaceAddRow({
  place,
  onAdd,
}: {
  place: PlaceHit;
  onAdd: (name: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onAdd(place.name)}
      accessibilityRole="button"
      accessibilityLabel={`Add ${place.name} to the list`}
      style={styles.addRow}
    >
      <View style={styles.pickRb}>
        <Text style={styles.addName}>{place.name}</Text>
        {place.subtitle ? <Text style={styles.addSub}>{place.subtitle}</Text> : null}
      </View>
      <View style={styles.addBtn}>
        <Text style={styles.addBtnText}>Add</Text>
      </View>
    </Pressable>
  );
}

const MEET_SLOTS: { hour: number; minute: 0 | 30; label: string }[] = [
  { hour: 17, minute: 0, label: "5:00 PM" },
  { hour: 17, minute: 30, label: "5:30 PM" },
  { hour: 18, minute: 0, label: "6:00 PM" },
  { hour: 18, minute: 30, label: "6:30 PM" },
  { hour: 19, minute: 0, label: "7:00 PM" },
  { hour: 19, minute: 30, label: "7:30 PM" },
  { hour: 20, minute: 0, label: "8:00 PM" },
  { hour: 20, minute: 30, label: "8:30 PM" },
  { hour: 21, minute: 0, label: "9:00 PM" },
  { hour: 21, minute: 30, label: "9:30 PM" },
  { hour: 22, minute: 0, label: "10:00 PM" },
  { hour: 22, minute: 30, label: "10:30 PM" },
];

function formatMeetTime(meetAt: string | null | undefined): string | null {
  if (!meetAt) return null;
  const date = new Date(meetAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function meetSlotSelected(
  meetHour: number | null | undefined,
  meetMinute: number | null | undefined,
  hour: number,
  minute: number,
): boolean {
  return meetHour === hour && meetMinute === minute;
}

export function PlacePicker({
  area,
  places,
  pinnedPlace,
  isHost = false,
  onVote,
  onAdd,
  onRemove,
  onArea,
  onSearch,
  onSuggest,
  page = false,
}: {
  area: string;
  places: PlaceVote[];
  pinnedPlace?: string | null;
  isHost?: boolean;
  onVote: (name: string | null) => void;
  onAdd: (name: string) => void | Promise<void>;
  onRemove?: (name: string) => void | Promise<void>;
  onArea: (area: string) => void | Promise<void>;
  onSearch: (query: string, area: string) => Promise<{ places: PlaceHit[]; source: string }>;
  onSuggest: (area: string) => Promise<{ places: PlaceHit[]; source: string }>;
  page?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState("openstreetmap");
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingArea, setEditingArea] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [areaDraft, setAreaDraft] = useState(area);
  const searchWait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSerial = useRef(0);
  const suggestSerial = useRef(0);

  useEffect(() => {
    if (!editingArea) setAreaDraft(area);
  }, [area, editingArea]);

  useEffect(() => {
    return () => {
      if (searchWait.current) clearTimeout(searchWait.current);
    };
  }, []);

  function search(text = query, immediate = false) {
    if (searchWait.current) clearTimeout(searchWait.current);
    const q = text.trim();
    if (!q) {
      searchSerial.current += 1;
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    const fire = () => {
      const serial = ++searchSerial.current;
      setSearching(true);
      onSearch(q, area)
        .then((found) => {
          if (serial !== searchSerial.current) return;
          setResults(found.places);
          setSource(found.source);
          setSearched(true);
        })
        .catch(() => {
          if (serial !== searchSerial.current) return;
          setResults([]);
          setSearched(true);
        })
        .finally(() => {
          if (serial === searchSerial.current) setSearching(false);
        });
    };
    if (immediate) fire();
    else searchWait.current = setTimeout(fire, 300);
  }

  async function addResult(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    searchSerial.current += 1;
    setQuery("");
    setResults([]);
    setSearched(false);
    setSearching(false);
  }

  useEffect(() => {
    if (!isHost) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    if (searchWait.current) clearTimeout(searchWait.current);
    searchSerial.current += 1;
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setSearched(false);
    setSearching(false);
    const serial = ++suggestSerial.current;
    setSuggesting(true);
    onSuggest(area)
      .then((found) => {
        if (serial !== suggestSerial.current) return;
        setSuggestions(found.places.slice(0, 10));
        setSource(found.source);
      })
      .catch(() => {
        if (serial !== suggestSerial.current) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (serial === suggestSerial.current) setSuggesting(false);
      });
  }, [area, isHost]);

  async function commitArea() {
    if (!isHost) return;
    const next = areaDraft.trim();
    if (!next || next === area) {
      setEditingArea(false);
      setAreaDraft(area);
      return;
    }
    setSavingArea(true);
    try {
      await onArea(next);
      setEditingArea(false);
    } catch {
      setAreaDraft(next);
    } finally {
      setSavingArea(false);
    }
  }

  function cancelArea() {
    setAreaDraft(area);
    setEditingArea(false);
  }

  const topVotes = places.reduce((top, place) => Math.max(top, place.votes), 0);
  const tied =
    topVotes > 0 && places.filter((place) => place.votes === topVotes).length > 1;
  const readyToVote = places.length >= 2;
  const mine = places.find((place) => place.mine);
  const youPicked = Boolean(mine);
  const title = readyToVote
    ? "Vote"
    : isHost
      ? "Pick places"
      : "Where";
  const lead = !readyToVote
    ? isHost
      ? "Set the town, then add 2 or 3 places. Everyone votes after that."
      : "Waiting for the host to pick places."
    : tied && pinnedPlace
      ? `It's a tie, so ${pinnedPlace} stays. Tap a row to break it.`
      : youPicked
        ? `Your pick is ${mine?.name}. Tap a row to change it.`
        : "Tap a row. The most taps is the plan.";
  const already = new Set(places.map((place) => place.name.toLowerCase()));
  const bars = uniquePlaces(suggestions.filter((place) => !already.has(place.name.toLowerCase())));
  const searchHits = uniquePlaces(results.filter((place) => !already.has(place.name.toLowerCase())));

  function addFromHit(name: string) {
    void addResult(name);
  }

  return (
    <View style={page ? styles.pickPage : styles.pick}>
      {!page ? (
      <View style={styles.areaCard}>
        {isHost && editingArea ? (
          <>
            <Text style={styles.areaKicker}>Town or neighbourhood</Text>
            <TextInput
              value={areaDraft}
              onChangeText={setAreaDraft}
              onSubmitEditing={() => {
                void commitArea();
              }}
              autoFocus
              maxLength={40}
              placeholder="Ballston Spa"
              placeholderTextColor={colors.dim}
              style={styles.pickField}
            />
            <View style={styles.areaActions}>
              <Pressable
                onPress={() => {
                  void commitArea();
                }}
                disabled={savingArea || !areaDraft.trim() || areaDraft.trim() === area}
                accessibilityRole="button"
                accessibilityLabel="Save town"
                style={[
                  styles.planEdit,
                  (savingArea || !areaDraft.trim() || areaDraft.trim() === area) && styles.areaSaveOff,
                ]}
              >
                <Text style={styles.planEditText}>{savingArea ? "Saving" : "Save"}</Text>
              </Pressable>
              <Pressable
                onPress={cancelArea}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.planEdit}
              >
                <Text style={styles.planEditText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.areaRow}>
            <View style={styles.planBody}>
              <Text style={styles.areaKicker}>Looking in</Text>
              <Text style={styles.areaName}>{area}</Text>
            </View>
            {isHost ? (
              <Pressable
                onPress={() => setEditingArea(true)}
                accessibilityRole="button"
                accessibilityLabel={`Change town, currently ${area}`}
                style={styles.planEdit}
              >
                <Text style={styles.planEditText}>Change</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        <Text style={styles.areaNote}>
          {isHost
            ? "Search stays in this town. A change is for everyone on this night."
            : "The host set this town for the night."}
        </Text>
      </View>
      ) : null}

      {isHost ? (
        <>
          <View style={[styles.pickSearch, searchFocused && styles.composerFocus]}>
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                search(text);
              }}
              placeholder="Search a bar or restaurant"
              placeholderTextColor={colors.dim}
              style={styles.pickSearchField}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={() => search(query, true)}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => search(query, true)}
              disabled={!query.trim()}
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={[styles.pickSearchBtn, !!query.trim() && styles.sendReady]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Circle
                  cx={11}
                  cy={11}
                  r={6.5}
                  fill="none"
                  stroke={query.trim() ? colors.ink : colors.lamp}
                  strokeWidth={1.8}
                />
                <Path
                  d="M16 16l5 5"
                  fill="none"
                  stroke={query.trim() ? colors.ink : colors.lamp}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>
          {searching ? <Text style={styles.areaNote}>Searching…</Text> : null}
          {searched && !searching ? (
            <View style={styles.pickRes}>
              <Text style={styles.pickResH}>Add to the list</Text>
              {searchHits.length === 0 ? (
                <>
                  <Text style={styles.pickEmpty}>Nothing in {area} matches that.</Text>
                  {query.trim() && !already.has(query.trim().toLowerCase()) ? (
                    <PlaceAddRow
                      key={`custom-${query.trim().toLowerCase()}`}
                      place={{
                        name: query.trim(),
                        subtitle: "Not in the list. Add it anyway.",
                      }}
                      onAdd={addFromHit}
                    />
                  ) : null}
                </>
              ) : (
                searchHits.map((r, i) => (
                  <PlaceAddRow key={`search-${i}`} place={r} onAdd={addFromHit} />
                ))
              )}
              <Text style={styles.pickAttr}>
                {source === "google" ? "Places data · Google" : "Places data · OpenStreetMap"}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.pickSection}>
        <Text style={styles.pickTitle}>{title}</Text>
        <Text style={styles.pickLead}>{lead}</Text>

        {places.length > 0 ? (
          <View style={styles.pickList}>
            {places.map((place, index) => {
              const taps = `${place.votes} ${place.votes === 1 ? "tap" : "taps"}`;
              const canVote = readyToVote;
              return (
                <View
                  key={`vote-${index}`}
                  style={[styles.pickOpt, place.mine && styles.pickOptOn, !canVote && styles.areaSaveOff]}
                >
                  <Pressable
                    onPress={() => {
                      if (!canVote) return;
                      onVote(place.mine ? null : place.name);
                    }}
                    disabled={!canVote}
                    accessibilityRole="button"
                    accessibilityLabel={
                      !canVote
                        ? `${place.name} is on the list. Waiting for more places before voting.`
                        : place.mine
                          ? `${place.name}, your pick, ${taps}. Tap to clear it.`
                          : `${place.name}, ${taps}. Tap to vote for it.`
                    }
                    style={styles.pickVote}
                  >
                    <Text style={styles.pickName}>{place.name}</Text>
                    <View style={styles.pickMeta}>
                      {canVote && place.mine ? <Text style={styles.pickYou}>Your pick</Text> : null}
                      {canVote ? (
                        <Text style={[styles.pickN, place.mine && styles.pickNOn]}>{taps}</Text>
                      ) : (
                        <Text style={styles.pickYou}>On the list</Text>
                      )}
                    </View>
                  </Pressable>
                  {isHost && onRemove ? (
                    <Pressable
                      onPress={() => {
                        void onRemove(place.name);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${place.name} from the vote`}
                      hitSlop={8}
                      style={styles.pickRemove}
                    >
                      <Text style={styles.pickRemoveText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {isHost && !query.trim() ? (
        <View style={[styles.pickRes, styles.pickSuggest]}>
          <Text style={styles.pickResH}>Top places in {area}</Text>
          {suggesting ? <Text style={styles.areaNote}>Finding places…</Text> : null}
          {!suggesting && bars.length === 0 ? (
            <Text style={styles.pickEmpty}>Nothing turned up. Try a search.</Text>
          ) : null}
          {bars.map((r, i) => (
            <PlaceAddRow key={`suggest-${i}`} place={r} onAdd={addFromHit} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function PlacePage({
  visible,
  onClose,
  area,
  places,
  pinnedPlace,
  meetAt,
  meetHour,
  meetMinute,
  isHost,
  onVote,
  onAdd,
  onRemove,
  onArea,
  onMeet,
  onSearch,
  onSuggest,
}: {
  visible: boolean;
  onClose: () => void;
  area: string;
  places: PlaceVote[];
  pinnedPlace?: string | null;
  meetAt?: string | null;
  meetHour?: number | null;
  meetMinute?: number | null;
  isHost?: boolean;
  onVote: (name: string | null) => void;
  onAdd: (name: string) => void | Promise<void>;
  onRemove?: (name: string) => void | Promise<void>;
  onArea: (area: string) => void | Promise<void>;
  onMeet?: (hour: number, minute: 0 | 30) => void | Promise<void>;
  onSearch: (query: string, area: string) => Promise<{ places: PlaceHit[]; source: string }>;
  onSuggest: (area: string) => Promise<{ places: PlaceHit[]; source: string }>;
}) {
  const insets = useSafeAreaInsets();
  const [editingArea, setEditingArea] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [savingMeet, setSavingMeet] = useState(false);
  const [areaDraft, setAreaDraft] = useState(area);
  const meetLabel = formatMeetTime(meetAt);

  useEffect(() => {
    if (!editingArea) setAreaDraft(area);
  }, [area, editingArea]);

  useEffect(() => {
    if (!visible) {
      setEditingArea(false);
      setAreaDraft(area);
      setSavingMeet(false);
    }
  }, [visible, area]);

  async function commitArea() {
    if (!isHost) return;
    const next = areaDraft.trim();
    if (!next || next === area) {
      setEditingArea(false);
      setAreaDraft(area);
      return;
    }
    setSavingArea(true);
    try {
      await onArea(next);
      setEditingArea(false);
    } catch {
      setAreaDraft(next);
    } finally {
      setSavingArea(false);
    }
  }

  async function pickMeet(hour: number, minute: 0 | 30) {
    if (!isHost || !onMeet || savingMeet) return;
    if (meetSlotSelected(meetHour, meetMinute, hour, minute)) return;
    setSavingMeet(true);
    try {
      await onMeet(hour, minute);
    } finally {
      setSavingMeet(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.placePage, Platform.OS === "web" ? { minHeight: "100%" } : null]}>
        <AmbientBackground />
        <View style={[styles.placePageBar, { paddingTop: Math.max(insets.top, 18) }]}>
          <View style={styles.placePageHead}>
            <Text style={styles.placePageKicker}>Where</Text>
            {editingArea && isHost ? (
              <View style={styles.placeAreaEdit}>
                <TextInput
                  value={areaDraft}
                  onChangeText={setAreaDraft}
                  onSubmitEditing={() => {
                    void commitArea();
                  }}
                  autoFocus
                  maxLength={40}
                  placeholder="Ballston Spa"
                  placeholderTextColor={colors.dim}
                  style={styles.placeAreaField}
                />
                <Pressable
                  onPress={() => {
                    void commitArea();
                  }}
                  disabled={savingArea || !areaDraft.trim() || areaDraft.trim() === area}
                  accessibilityRole="button"
                  accessibilityLabel="Save town"
                  style={[
                    styles.planEdit,
                    (savingArea || !areaDraft.trim() || areaDraft.trim() === area) &&
                      styles.areaSaveOff,
                  ]}
                >
                  <Text style={styles.planEditText}>{savingArea ? "Saving" : "Save"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAreaDraft(area);
                    setEditingArea(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.planEdit}
                >
                  <Text style={styles.planEditText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.placeAreaRow}>
                <Text style={styles.placeAreaLabel}>Looking in</Text>
                <Text style={styles.placeAreaName} numberOfLines={1}>
                  {area}
                </Text>
                {isHost ? (
                  <Pressable
                    onPress={() => setEditingArea(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Change town, currently ${area}`}
                    hitSlop={8}
                  >
                    <Text style={styles.placeAreaChange}>Change</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.threadClose}
          >
            <Text style={styles.threadCloseMark}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.screenX,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.meetBlock}>
            <Text style={styles.meetKicker}>Meet at</Text>
            {isHost && onMeet ? (
              <View style={styles.meetChips}>
                {MEET_SLOTS.map((slot) => {
                  const on = meetSlotSelected(meetHour, meetMinute, slot.hour, slot.minute);
                  return (
                    <Pressable
                      key={`${slot.hour}:${slot.minute}`}
                      onPress={() => {
                        void pickMeet(slot.hour, slot.minute);
                      }}
                      disabled={savingMeet}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Meet at ${slot.label}`}
                      style={[styles.meetChip, on && styles.meetChipOn]}
                    >
                      <Text style={[styles.meetChipText, on && styles.meetChipTextOn]}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.meetValue}>
                {meetLabel ? `${meetLabel}` : "Host hasn't set a time yet"}
              </Text>
            )}
          </View>
          <PlacePicker
            page
            area={area}
            places={places}
            pinnedPlace={pinnedPlace}
            isHost={isHost}
            onVote={onVote}
            onAdd={onAdd}
            onRemove={onRemove}
            onArea={onArea}
            onSearch={onSearch}
            onSuggest={onSuggest}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const WAVE = [5, 11, 7, 14, 8, 12, 6, 15, 9, 11, 5];

export function VoiceBubble({
  durationMs,
  from,
  mine,
  grouped,
  playing,
  onPress,
}: {
  durationMs: number;
  from?: string;
  mine?: boolean;
  grouped?: boolean;
  playing?: boolean;
  onPress: () => void;
}) {
  const total = Math.max(1, Math.round(durationMs / 1000));
  const label = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Voice note ${label}`}
      style={[styles.msg, mine ? styles.msgMe : styles.msgThem, grouped && styles.msgGrouped]}
    >
      {from && !mine ? <Text style={styles.msgFrom}>{from}</Text> : null}
      <View style={styles.voiceRow}>
        <View style={styles.voiceBars}>
          {WAVE.map((h, i) => (
            <View
              key={i}
              style={[
                styles.voiceBar,
                { height: h },
                { backgroundColor: playing ? colors.lamp : mine ? colors.ink : colors.chalk },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.voiceLen, mine && styles.msgBodyMe]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function MessageBubble({
  body,
  from,
  mine,
  grouped,
}: {
  body: string;
  from?: string;
  mine?: boolean;
  grouped?: boolean;
}) {
  return (
    <View style={[styles.msg, mine ? styles.msgMe : styles.msgThem, grouped && styles.msgGrouped]}>
      {from && !mine ? <Text style={styles.msgFrom}>{from}</Text> : null}
      <Text style={[styles.msgBody, mine && styles.msgBodyMe]}>{body}</Text>
    </View>
  );
}

export function SysMessage({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sys}>{children}</Text>;
}

const micPulse =
  Platform.OS === "web"
    ? ({
        animationName: "sua-mic",
        animationDuration: "1.4s",
        animationIterationCount: "infinite",
        animationTimingFunction: "ease-in-out",
      } as object)
    : null;

export function Composer({
  value,
  onChange,
  onSend,
  ready,
  recording,
  onMic,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  ready: boolean;
  recording?: boolean;
  onMic?: () => void;
  hint?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  ensureBreathe();
  return (
    <View>
      {hint ? <Text style={styles.composerHint}>{hint}</Text> : null}
      <View style={[styles.composer, focused && styles.composerFocus]}>
      <Pressable
        onPress={onMic}
        accessibilityLabel={recording ? "Stop voice note" : "Voice note"}
        style={[styles.mic, recording && styles.micOn, recording && micPulse]}
      >
        <Svg width={15} height={15} viewBox="0 0 24 24">
          <Path d="M8 5a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0z" fill={recording ? colors.ink : colors.chalk} />
          <Path
            d="M5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.9V21h-2v-3.1A7 7 0 0 1 5 11z"
            fill={recording ? colors.ink : colors.chalk}
          />
        </Svg>
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Message"
        placeholderTextColor={colors.dim}
        style={styles.composerField}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => {
          if (ready) onSend();
        }}
      />
      <Pressable
        onPress={onSend}
        disabled={!ready}
        style={[styles.send, ready && styles.sendReady]}
      >
        <Svg width={15} height={15} viewBox="0 0 24 24">
          <Path
            d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"
            fill={ready ? colors.ink : colors.muted}
          />
        </Svg>
      </Pressable>
      </View>
    </View>
  );
}

export function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quietHit} accessibilityRole="link">
      <Text style={styles.quiet}>{label}</Text>
    </Pressable>
  );
}

/** Slim entry to the live hangout thread — secondary to page actions like Save. */
export function ActiveThreadLink({
  label,
  names,
  onPress,
  style,
}: {
  label: string;
  names?: string[];
  onPress: () => void;
  style?: object;
}) {
  const who = (names ?? []).filter(Boolean).slice(0, 3).join(", ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={who ? `Open ${label} thread with ${who}` : `Open ${label} thread`}
      style={[styles.threadJump, style]}
    >
      <View style={styles.threadJumpBody}>
        <Text style={styles.threadJumpKicker}>Thread</Text>
        <Text style={styles.threadJumpTitle} numberOfLines={1}>
          {label}
        </Text>
        {who ? (
          <Text style={styles.threadJumpNames} numberOfLines={1}>
            {who}
          </Text>
        ) : null}
      </View>
      <Text style={styles.threadJumpAction}>Open</Text>
    </Pressable>
  );
}

export function Linkish({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={8}
      style={style}
    >
      <Text style={styles.linkish}>{label}</Text>
    </Pressable>
  );
}

export function ErrText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.err}>{children}</Text>;
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.night, overflow: "hidden" },
  screenScroll: { flex: 1, backgroundColor: "transparent", zIndex: 1 },
  screenHead: {
    zIndex: 4,
    backgroundColor: colors.night,
    paddingHorizontal: spacing.screenX,
    paddingTop: 36,
    paddingBottom: 10,
  },
  screenHeadCompact: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  screenDock: {
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    paddingHorizontal: spacing.screenX,
    paddingTop: 8,
    backgroundColor: colors.night,
  },
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
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: colors.lamp,
  },
  btnGhost: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  btnDanger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  btnPressed: { opacity: 0.88 },
  btnDisabled: { backgroundColor: colors.surface2 },
  btnDisabledSoft: { opacity: 0.45 },
  btnTextDisabled: { color: colors.muted },
  btnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  btnTextGhost: { color: colors.chalk },
  btnTextDanger: { color: colors.danger },
  actions: { gap: 9, marginTop: 16 },
  actionsRow: { flexDirection: "row" },
  panel: {
    marginTop: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
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
    backgroundColor: "rgba(223,139,50,0.07)",
  },
  otpCellError: {
    borderColor: "rgba(217,105,79,0.65)",
  },
  otpFilled: { borderColor: "rgba(223,139,50,0.4)" },
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
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optinBoxOn: { backgroundColor: colors.lamp, borderColor: colors.lamp },
  optinCheck: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  optinText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.chalk,
  },
  devcheck: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(223,139,50,0.30)",
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
    backgroundColor: "rgba(223,139,50,0.07)",
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
  askbarDone: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    color: colors.lamp,
    marginBottom: 16,
  },
  mutual: {
    backgroundColor: colors.fineprintBg,
    borderRadius: 13,
    padding: 15,
    marginTop: 22,
  },
  mutualH: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.33,
    textTransform: "uppercase",
    color: colors.dim,
    marginBottom: 9,
  },
  mutualRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  mutualIcon: { color: colors.lamp, fontSize: 12.5 },
  mutualIconNo: { color: colors.muted },
  mutualText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.dim,
  },
  codeCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.xl,
    padding: 19,
    marginTop: 20,
  },
  codeCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  codeCardBody: {
    flex: 1,
    minWidth: 0,
  },
  qrPad: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.chalk,
  },
  copy: {
    alignSelf: "flex-start",
    marginTop: 13,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: "rgba(250,247,242,0.04)",
  },
  copyCopied: {
    borderColor: colors.lamp,
    backgroundColor: "rgba(223,139,50,0.12)",
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
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkctlK: { fontFamily: fonts.body, fontSize: 13, color: colors.dim },
  linkctlV: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.chalk,
    textAlign: "right",
    flexShrink: 1,
  },
  pips: { flexDirection: "row", gap: 8, marginTop: 24 },
  pip: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(250,247,242,0.14)" },
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
    color: "#948D85",
    marginTop: 24,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250,247,242,0.075)",
  },
  person: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#000000" },
  dotFree: {
    backgroundColor: colors.lamp,
    ...Platform.select({
      web: { boxShadow: "0 0 11px rgba(243,194,103,0.75)" },
      default: {
        shadowColor: "#F3C267",
        shadowOpacity: 0.75,
        shadowRadius: 11,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  personName: { flex: 1, fontFamily: fonts.body, fontSize: 14.5 },
  personNameFree: { color: colors.chalk },
  personNameDim: { color: "#948D85" },
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
  nudgeDone: { borderColor: colors.line, opacity: 0.55 },
  nudgeTextDone: { color: colors.muted },
  removeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  strip: { flexDirection: "row", gap: 8, marginTop: 24, height: 210 },
  night: { flex: 1, gap: 7, flexDirection: "column" },
  pane: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: colors.pane,
    borderWidth: 1,
    borderColor: "rgba(250,247,242,0.05)",
  },
  paneLit: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(247,213,154,0.55)",
    ...Platform.select({
      web: { boxShadow: "0 0 11px rgba(223,139,50,0.3)" },
      default: {
        shadowColor: colors.lamp,
        shadowOpacity: 0.3,
        shadowRadius: 11,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
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
    alignItems: "flex-start",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  threadTopL: { flex: 1, paddingTop: 10 },
  threadTopR: { flexDirection: "row", alignItems: "center", gap: 2 },
  threadClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  threadCloseMark: {
    fontFamily: fonts.body,
    fontSize: 22,
    lineHeight: 24,
    color: colors.dim,
  },
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
  compactBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.chalk,
  },
  compactPlan: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
    marginTop: 1,
  },
  compactPlace: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.chalk,
    marginTop: 1,
  },
  planH: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.26,
    textTransform: "uppercase",
    color: colors.dim,
  },
  planV: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.chalk, marginTop: 4 },
  planPlace: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    color: colors.chalk,
    marginTop: 2,
  },
  planEdit: {
    height: 34,
    borderWidth: 1,
    borderColor: "rgba(223,139,50,0.35)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  planEditText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  planDir: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(223,139,50,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  planDirIcon: { color: colors.lamp, fontSize: 14 },
  pick: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
  },
  pickPage: { paddingTop: 4 },
  pickSection: {
    marginTop: 22,
  },
  placePage: { flex: 1, backgroundColor: colors.night },
  placePageBar: {
    zIndex: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.night,
    paddingHorizontal: spacing.screenX - 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  placePageHead: {
    flex: 1,
    paddingLeft: 8,
    gap: 4,
    minWidth: 0,
  },
  placePageKicker: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  meetBlock: {
    marginTop: 6,
    marginBottom: 4,
    gap: 10,
  },
  meetKicker: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.dim,
  },
  meetValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.chalk,
  },
  meetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  meetChipOn: {
    borderColor: "rgba(223,139,50,0.55)",
    backgroundColor: "rgba(223,139,50,0.12)",
  },
  meetChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.chalk,
  },
  meetChipTextOn: {
    color: colors.lamp,
  },
  placeAreaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  placeAreaLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
  },
  placeAreaName: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.chalk,
  },
  placeAreaChange: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  placeAreaEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  placeAreaField: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 120,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: colors.lamp,
    paddingVertical: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  pickTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.chalk,
    marginTop: 0,
  },
  pickLead: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dim,
    marginTop: 6,
    marginBottom: 16,
  },
  pickRule: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dim,
    marginTop: 2,
    marginBottom: 12,
  },
  pickList: { gap: 8 },
  pickOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
  },
  pickVote: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
  },
  pickOptOn: {
    borderColor: "rgba(223,139,50,0.55)",
    backgroundColor: "rgba(223,139,50,0.1)",
  },
  pickName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.chalk },
  pickMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickYou: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.lamp,
  },
  pickN: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim, minWidth: 12, textAlign: "right" },
  pickNOn: { color: colors.lamp },
  pickRemove: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  pickRemoveText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.dim,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  addName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.chalk,
  },
  addSub: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.dim,
    marginTop: 2,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: "rgba(223,139,50,0.35)",
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  pickSearch: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 58,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "border-color, box-shadow",
          transitionDuration: "180ms",
          transitionTimingFunction: "ease",
        } as object)
      : null),
  },
  pickSearchField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16.5,
    color: colors.chalk,
    paddingVertical: 8,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  pickSearchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.pane,
    alignItems: "center",
    justifyContent: "center",
  },
  areaCard: {
    marginTop: 4,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 10,
  },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  areaKicker: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.dim,
  },
  areaName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.chalk,
    marginTop: 3,
  },
  areaNote: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.dim,
  },
  areaActions: { flexDirection: "row", gap: 8 },
  areaSaveOff: { opacity: 0.4 },
  pickEmpty: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.dim,
    marginBottom: 8,
  },
  pickField: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.chalk,
  },
  pickGo: {
    width: 40,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pickGoText: { color: colors.lamp, fontSize: 18 },
  pickArea: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 12 },
  pickAreaText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim },
  pickAreaBtn: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.lamp,
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
  },
  pickAreaNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  pickRes: { marginTop: 12, gap: 8 },
  pickSuggest: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pickResH: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.33,
    textTransform: "uppercase",
    color: colors.dim,
    marginBottom: 4,
  },
  pickR: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  pickRb: { flex: 1 },
  pickRn: { fontFamily: fonts.body, fontSize: 13.5, color: colors.chalk },
  pickRs: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 2 },
  pickRadd: { fontFamily: fonts.mono, fontSize: 15, color: colors.lamp },
  pickAttr: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.muted,
    marginTop: 10,
    letterSpacing: 0.54,
  },
  pickF: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.muted,
    marginTop: 11,
    lineHeight: 16,
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
  msgGrouped: {
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    marginTop: -1,
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
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.composer,
    paddingVertical: 7,
    paddingHorizontal: 9,
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "border-color, box-shadow",
          transitionDuration: "180ms",
          transitionTimingFunction: "ease",
        } as object)
      : null),
  },
  composerFocus: {
    borderColor: "rgba(223,139,50,0.55)",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 1px rgba(223,139,50,0.2), 0 0 18px rgba(223,139,50,0.42)",
      },
      default: {
        shadowColor: colors.lamp,
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  mic: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: colors.lamp },
  composerHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.dim,
    textAlign: "center",
    marginBottom: 8,
  },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  voiceBars: { flexDirection: "row", alignItems: "center", gap: 2, height: 16 },
  voiceBar: { width: 2, borderRadius: 1 },
  voiceLen: { fontFamily: fonts.mono, fontSize: 12, color: colors.chalk },
  pickAreaField: {
    minWidth: 120,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.lamp,
    borderBottomWidth: 1,
    borderBottomColor: colors.lamp,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  composerField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.chalk,
    paddingVertical: 9,
    paddingHorizontal: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
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
  quietHit: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  quiet: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(169,161,152,0.35)",
  },
  threadJump: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface2,
  },
  threadJumpBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  threadJumpKicker: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.lamp,
  },
  threadJumpTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.chalk,
  },
  threadJumpNames: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
    marginTop: 1,
  },
  threadJumpAction: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.lamp,
  },
  linkish: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.lamp,
    textDecorationLine: "underline",
  },
  peopleSep: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  err: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: 14 },
  weekFoot: {
    alignItems: "center",
    marginTop: 22,
    gap: 16,
    paddingHorizontal: spacing.screenX,
  },
  quiethours: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 300,
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
  inviteNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.dim,
    marginTop: 12,
    maxWidth: 280,
  },
  inviteOffTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    color: colors.chalk,
    marginBottom: 4,
  },
  codeMono: {
    fontFamily: fonts.mono,
    fontSize: 24,
    letterSpacing: 1.2,
    color: colors.lamp,
  },
  linkctlKill: {
    width: "100%",
    marginTop: 13,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.pill,
    paddingVertical: 11,
    alignItems: "center",
  },
  linkctlKillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger },
});

// Re-export style helpers used inline in screens
export { styles as uiStyles };
