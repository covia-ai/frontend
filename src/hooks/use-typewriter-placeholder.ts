import { useEffect, useRef, useState } from "react";

const TYPE_MS = 45;
const DELETE_MS = 25;
const PAUSE_TICK_MS = 400;
const PAUSE_TICKS = 3;

// Cycles through `samples`, typing and deleting each one into the returned
// string (for use as a placeholder) with a trailing blinking "|" caret —
// mirrors the effect on studio.lyzr.ai's prompt box. Stops as soon as
// `active` goes false (the caller should pass false once the user has typed
// their own text) and freezes on the last rendered frame.
export function useTypewriterPlaceholder(samples: string[], active: boolean): string {
  const [display, setDisplay] = useState("");
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  useEffect(() => {
    if (!active || samplesRef.current.length === 0) return;

    let sampleIndex = 0;
    let charIndex = 0;
    let phase: "typing" | "pausing" | "deleting" = "typing";
    let pauseTicks = 0;
    let cursorOn = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = samplesRef.current[sampleIndex % samplesRef.current.length];
      let delay: number = TYPE_MS;

      if (phase === "typing") {
        charIndex++;
        setDisplay(current.slice(0, charIndex) + "|");
        if (charIndex >= current.length) {
          phase = "pausing";
          pauseTicks = 0;
        }
      } else if (phase === "pausing") {
        cursorOn = !cursorOn;
        setDisplay(current + (cursorOn ? "|" : " "));
        pauseTicks++;
        delay = PAUSE_TICK_MS;
        if (pauseTicks >= PAUSE_TICKS) {
          phase = "deleting";
        }
      } else {
        charIndex--;
        setDisplay(current.slice(0, charIndex) + "|");
        delay = DELETE_MS;
        if (charIndex <= 0) {
          phase = "typing";
          sampleIndex++;
        }
      }

      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timeoutId);
  }, [active]);

  return display;
}
