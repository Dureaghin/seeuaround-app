import { api } from "./api";
import { clearToken } from "./auth-store";

export async function signOut(): Promise<void> {
  try {
    await api.logout();
  } catch {
    // Local sign-out still succeeds if the network call fails.
  }
  await clearToken();
}
