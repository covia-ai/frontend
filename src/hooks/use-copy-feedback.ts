"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { writeTextToClipboard } from "@/lib/clipboard";
import { notifyError } from "@/lib/notify";

/**
 * Copy with an in-place confirmation (a checkmark) instead of a toast:
 * `copied` turns true only once the write has succeeded, then resets. A
 * refused write is reported as an error — never as a copy.
 */
export function useCopyFeedback(failureTitle: string, resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await writeTextToClipboard(value);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      } catch (error: unknown) {
        notifyError(failureTitle, error);
      }
    },
    [failureTitle, resetAfterMs],
  );

  return { copied, copy };
}
