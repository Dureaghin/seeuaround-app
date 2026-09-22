import { Platform } from "react-native";

const INVITE_URL_KEY = "seeuaround_invite_url";
const INVITE_OWNER_KEY = "seeuaround_invite_owner";

function isWeb(): boolean {
  return Platform.OS === "web" || typeof window !== "undefined";
}

async function read(key: string): Promise<string | null> {
  if (isWeb()) return localStorage.getItem(key);
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (isWeb()) {
    localStorage.setItem(key, value);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string): Promise<void> {
  if (isWeb()) {
    localStorage.removeItem(key);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(key);
}

/** The saved link belongs to this account. A link left by someone else on the phone is ignored. */
export async function getStoredInviteUrl(ownerId: string): Promise<string | null> {
  const url = await read(INVITE_URL_KEY);
  if (!url) return null;
  const owner = await read(INVITE_OWNER_KEY);
  if (!owner) {
    await write(INVITE_OWNER_KEY, ownerId);
    return url;
  }
  if (owner !== ownerId) return null;
  return url;
}

export async function setStoredInviteUrl(url: string, ownerId: string): Promise<void> {
  await write(INVITE_URL_KEY, url);
  await write(INVITE_OWNER_KEY, ownerId);
}

export async function clearStoredInviteUrl(): Promise<void> {
  await remove(INVITE_URL_KEY);
  await remove(INVITE_OWNER_KEY);
}

export function formatInviteExpiry(
  expiresAt: string | null | undefined,
  fallbackDays = 7,
): string {
  if (!expiresAt) return `in ${fallbackDays} days`;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return `in ${fallbackDays} days`;
  const days = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}
