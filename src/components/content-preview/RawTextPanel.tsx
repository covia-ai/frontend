"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ErrorDisplay } from "@/components/ErrorDisplay";

type RawTextPanelProps = {
  value: string;
  loading?: boolean;
  error?: string | null;
};

export function RawTextPanel({
  value,
  loading = false,
  error = null,
}: RawTextPanelProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outside a secure browser context.
    }
  };

  if (error) {
    return <ErrorDisplay error={error} className="p-4" />;
  }

  return (
    <div className="relative h-full">
      <button
        onClick={() => void copy()}
        className="absolute right-2 top-2 z-10 rounded-md bg-muted p-1.5 transition-colors hover:bg-muted/80"
        title={copied ? "Copied!" : "Copy all"}
        aria-label={copied ? "Copied" : "Copy all"}
        disabled={loading}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <textarea
        readOnly
        value={loading ? "Loading…" : value}
        className="h-[450px] w-full resize-none rounded-lg border-none bg-background p-4 font-mono text-sm outline-none"
      />
    </div>
  );
}
