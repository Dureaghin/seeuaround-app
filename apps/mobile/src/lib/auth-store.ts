import { Platform } from "react-native";

const TOKEN_KEY = "seeuaround_token";

function isWeb(): boolean {
  return Platform.OS === "web" || typeof window !== "undefined";
}

export async function getToken(): Promise<string | null> {
  if (isWeb()) {
    return localStorage.getItem(TOKEN_KEY);
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (isWeb()) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (isWeb()) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
