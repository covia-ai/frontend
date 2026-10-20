"use client";

import { Code2, ShieldCheck } from "lucide-react";
import type { ReelCutId } from "@/config/demo-reel";
import { cn } from "@/lib/utils";

/**
 * What each cut is called on screen, and what it is for.
 *
 * Named by the room rather than by the artifact. "Narrated" described how the
 * cut was made, which told a viewer nothing and read oddly beside "CISO", a
 * label that names an audience. Both now answer the same question: who is this
 * one talking to?
 */
export const CUT_LABELS: Record<
  ReelCutId,
  { label: string; long: string; hint: string; Icon: typeof Code2 }
> = {
  narrated: {
    label: "Developer/CTO",
    long: "For Developers & CTOs",
    hint: "Told to whoever builds and runs the system",
    Icon: Code2,
  },
  ciso: {
    label: "CISO",
    long: "For CISOs",
    hint: "The same picture, told to whoever owns the risk",
    Icon: ShieldCheck,
  },
};

interface CutSwitcherProps {
  available: ReelCutId[];
  value: ReelCutId;
  onChange: (cut: ReelCutId) => void;
}

/**
 * Choose which voice is telling the clip.
 *
 * Two earlier versions sat *under* the picture — first as a bare segmented
 * pair, then as a labelled one — and neither was read as a control, because
 * something placed after the thing it modifies reads as a caption about it.
 * So these are tabs, above the video: the one pattern everybody already
 * understands as "there are two versions of this", met before you press play
 * rather than after. The selected tab is filled violet as well as underlined,
 * so which one you are on survives a glance.
 *
 * Only rendered when a clip has both cuts, which is eight of the thirteen. On
 * the other five there is no control at all rather than a disabled one: a
 * greyed-out switch invites the question "how do I enable this?", and the
 * answer is that nothing is missing.
 */
export function CutSwitcher({ available, value, onChange }: CutSwitcherProps) {
  if (available.length < 2) return null;

  return (
    <div
      className="flex border-b"
      role="tablist"
      aria-label="Choose a narration"
      data-testid="cut-switcher"
    >
      {available.map((cut) => {
        const { long, label, hint, Icon } = CUT_LABELS[cut];
        const selected = cut === value;
        return (
          <button
            key={cut}
            type="button"
            role="tab"
            aria-selected={selected}
            title={hint}
            data-testid={`cut-${cut}`}
            onClick={() => onChange(cut)}
            className={cn(
              "-mb-px flex cursor-pointer items-center gap-2 rounded-t-md border-b-2 px-4 py-2.5 text-sm transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden",
              selected
                ? "bg-icon-violet/20 text-icon-violet border-icon-violet font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent",
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {/* The long form says who it is for; the short form is all that
                fits on a phone, where the tab row is already two thirds of
                the dialog's width. */}
            <span className="hidden sm:inline">{long}</span>
            <span className="sm:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
