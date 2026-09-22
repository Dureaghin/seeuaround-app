import { Tabs } from "expo-router";
import { AppTabBar, type AppTabBarProps } from "../../src/components/AppTabBar";
import { colors } from "../../src/lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="people"
      tabBar={(props) => (
        <AppTabBar
          state={props.state}
          navigation={props.navigation as unknown as AppTabBarProps["navigation"]}
        />
      )}
      screenOptions={{
        headerShown: false,
        // Opaque scenes — transparent ones stack and bleed into each other on web.
        sceneStyle: { backgroundColor: colors.night, flex: 1 },
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="people" options={{ title: "People" }} />
      <Tabs.Screen name="sunday" options={{ title: "Week" }} />
      <Tabs.Screen name="invite" options={{ title: "Invite" }} />
    </Tabs>
  );
}
