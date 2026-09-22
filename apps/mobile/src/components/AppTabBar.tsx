import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useApp } from "../context/AppContext";
import { colors, fonts } from "../lib/theme";

export const TAB_BAR_HEIGHT = 56;

type TabName = "people" | "sunday" | "invite";

type TabRoute = { key: string; name: string };

export type AppTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: Record<string, unknown>) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const LABELS: Record<TabName, string> = {
  people: "People",
  sunday: "Week",
  invite: "Invite",
};

function TabIcon({ name, color }: { name: TabName; color: string }) {
  if (name === "people") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Circle cx={9} cy={7.5} r={3} fill="none" stroke={color} strokeWidth={1.6} />
        <Path
          d="M3.5 19.5v-1.2A3.8 3.8 0 0 1 7.3 14.5h3.4a3.8 3.8 0 0 1 3.8 3.8v1.2"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Path
          d="M16 11.2a3 3 0 0 0 0-5.7"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Path
          d="M20.5 19.5v-1.2a3.8 3.8 0 0 0-2.8-3.6"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (name === "sunday") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Path
          d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5z"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
        />
        <Path d="M3.5 10h17" fill="none" stroke={color} strokeWidth={1.6} />
        <Path
          d="M8 3.5v3.5M16 3.5v3.5"
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Circle cx={9} cy={8} r={3} fill="none" stroke={color} strokeWidth={1.6} />
      <Path
        d="M3.6 19.2c.7-3 2.7-4.5 5.4-4.5s4.7 1.5 5.4 4.5"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path d="M18 7.5v6M15 10.5h6" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const { me } = useApp();

  function needsAttention(route: TabName): boolean {
    if (route === "invite") return (me?.connectionCount ?? 0) < 5;
    if (route === "sunday") return !me?.weekSet;
    return false;
  }

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const name = route.name as TabName;
        const focused = state.index === index;
        const label = LABELS[name] ?? route.name;
        const attention = needsAttention(name);

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={[styles.tab, focused && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <View style={styles.tabInner}>
              <TabIcon name={name} color={focused ? colors.lamp : colors.dim} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </View>
            {attention && !focused ? <View style={styles.dot} accessibilityLabel="Needs attention" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: TAB_BAR_HEIGHT,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: "rgba(9,8,7,0.88)",
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabActive: {
    borderColor: colors.lampTintBorder,
    backgroundColor: colors.lampTintBg,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.dim,
  },
  labelActive: {
    color: colors.lamp,
  },
  dot: {
    position: "absolute",
    top: 6,
    right: "22%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lamp,
  },
});
