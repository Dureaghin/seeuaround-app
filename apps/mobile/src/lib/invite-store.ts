import { Platform } from "react-native";

const INVITE_URL_KEY = "seeuaround_invite_url";

function isWeb(): boolean {
  return Platform.OS === "web" || typeof window !== "undefined";
}

export async function getStoredInviteUrl(): Promise<string | null> {
  if (isWeb()) {
    return localStorage.getItem(INVITE_URL_KEY);
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(INVITE_URL_KEY);
}

export async function setStoredInviteUrl(url: string): Promise<void> {
  if (isWeb()) {
    localStorage.setItem(INVITE_URL_KEY, url);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(INVITE_URL_KEY, url);
}

export async function clearStoredInviteUrl(): Promise<void> {
  if (isWeb()) {
    localStorage.removeItem(INVITE_URL_KEY);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(INVITE_URL_KEY);
}

export function formatInviteExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}
