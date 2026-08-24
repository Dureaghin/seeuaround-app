/**
 * Routes anyone can open without a session.
 * Everything else requires a bearer token.
 *
 * Public:
 * - `/` (index bootstrap — handles its own redirect)
 * - `/(auth)/*` (email, code)
 * - `/j/:token` (invite landing preview)
 */
export function isPublicRoute(segments: string[]): boolean {
  const root = segments[0];
  if (!root || root === "index") return true;
  if (root === "(auth)") return true;
  if (root === "j") return true;
  return false;
}
