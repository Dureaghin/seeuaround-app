import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
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
    backgroundColor: colors.night,
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
