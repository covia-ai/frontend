"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { cn, writeTextToClipboard } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

interface CopyFieldProps {
  label: string;
  value: string;
  /** When set, the value renders as an external link to this href. */
  href?: string;
  className?: string;
}

// Label above, then the value and its copy control side by side — the copy
// button sits next to the VALUE it copies, never up beside the label. A brief
// checkmark confirms the copy without a toast.
export function CopyField({ label, value, href, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await writeTextToClipboard(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      notifyError(`Unable to copy ${label.toLowerCase()}`, error);
    }
  };

  const valueClasses = "bg-muted flex-1 min-w-0 rounded-md px-3 py-2 text-xs font-mono break-all";

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {href ? (
          <Link href={href} target="_blank" className={cn(valueClasses, "hover:underline")}>
            {value}
          </Link>
        ) : (
          <code className={cn(valueClasses, "select-all")}>{value}</code>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label={`Copy ${label}`}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : `Copy ${label}`}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
