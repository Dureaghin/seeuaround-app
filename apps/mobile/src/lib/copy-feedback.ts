import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";

/** Matches prototype copy feedback duration. */
export const COPY_FEEDBACK_MS = 1600;

export function useCopyFeedback(announce = "Copied to clipboard") {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      if (!text) return;
      await Clipboard.setStringAsync(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      if (Platform.OS !== "web") {
        AccessibilityInfo.announceForAccessibility(announce);
      }
    },
    [announce],
  );

  return { copied, copy };
}
