import { api } from "./api";
import { clearAuthEmail } from "./auth-email";
import { clearToken } from "./auth-store";
import { clearPendingInvite } from "./invite-pending";

export async function signOut(): Promise<void> {
  try {
    await api.logout();
  } catch {
    // Local sign-out still succeeds if the network call fails.
  }
  await clearToken();
  clearPendingInvite();
  clearAuthEmail();
}
