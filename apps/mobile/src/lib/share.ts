import { Platform, Share } from "react-native";

export type ShareOutcome = "shared" | "cancelled" | "unsupported";

type WebShareData = { title?: string; text?: string; url?: string };
type WebNavigator = Navigator & {
  share?: (data: WebShareData) => Promise<void>;
  canShare?: (data: WebShareData) => boolean;
};

function webNavigator(): WebNavigator | undefined {
  return typeof navigator !== "undefined" ? (navigator as WebNavigator) : undefined;
}

/** True when a native share sheet exists here (always on iOS/Android; on web only
 *  with the Web Share API, which needs HTTPS or localhost and a user gesture). */
export function canShare(): boolean {
  if (Platform.OS !== "web") return true;
  return typeof webNavigator()?.share === "function";
}

/** Open the platform share sheet. Never throws for "not available" — callers get
 *  "unsupported" back and should fall back to copying. */
export async function shareText(opts: {
  message: string;
  url?: string;
  title?: string;
}): Promise<ShareOutcome> {
  if (Platform.OS === "web") {
    const nav = webNavigator();
    const data: WebShareData = { title: opts.title, text: opts.message, url: opts.url };
    if (typeof nav?.share !== "function") return "unsupported";
    if (typeof nav.canShare === "function" && !nav.canShare(data)) return "unsupported";
    try {
      await nav.share(data);
      return "shared";
    } catch (err) {
      // User closed the sheet — not an error.
      if ((err as { name?: string })?.name === "AbortError") return "cancelled";
      return "unsupported";
    }
  }

  const result = await Share.share(
    { message: opts.message, url: opts.url, title: opts.title },
    { dialogTitle: opts.title },
  );
  return result.action === Share.dismissedAction ? "cancelled" : "shared";
}
