import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Stack, ThemeProvider, DarkTheme } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import { AppProvider } from "../src/context/AppContext";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { AuthGate } from "../src/components/AuthGate";
import { colors } from "../src/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.night,
    card: colors.night,
    primary: colors.lamp,
    text: colors.chalk,
    border: colors.line,
    notification: colors.lamp,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ThemeProvider value={navTheme}>
          <View style={{ flex: 1, backgroundColor: colors.night }}>
            <AmbientBackground />
            <View style={{ flex: 1, zIndex: 1 }}>
              <StatusBar style="light" />
              <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.night },
                    // Fade + transparent stacks leave the previous screen painted underneath.
                    animation: Platform.OS === "web" ? "none" : "fade",
                  }}
                />
              </AuthGate>
            </View>
          </View>
        </ThemeProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
