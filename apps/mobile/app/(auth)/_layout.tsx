import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "../../src/lib/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.night },
        // Avoid stacked aria-hidden screens on web (expo-router focus warning).
        animation: Platform.OS === "web" ? "none" : "fade",
      }}
    />
  );
}
