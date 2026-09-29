"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoredValue } from "@/hooks/use-stored-value";
import {
  defaultsFromOperationSchema,
  parseOperationInput,
  printOperationInput,
  TOP_LEVEL_INPUT_KEY,
  type OperationInputSchema,
} from "@/lib/operation-input";

export type OperationInputController = {
  ready: boolean;
  input: unknown;
  rawInput: Record<string, string>;
  typeMap: Record<string, string>;
  setValue: (key: string, value: unknown) => void;
  setRawValue: (key: string, value: string) => void;
  setType: (key: string, type: string) => void;
  reset: () => void;
};

type StoredOperationInput = {
  input?: unknown;
  rawInput?: Record<string, string>;
  types?: Record<string, string>;
};

/** The editable input for one operation, kept with the key it belongs to. */
type Draft = {
  key: string;
  input: unknown;
  rawInput: Record<string, string>;
  typeMap: Record<string, string>;
};

const EMPTY_INPUT: Record<string, unknown> = {};
const EMPTY_MAP: Record<string, string> = {};

function readStoredInput(storageKey: string): StoredOperationInput {
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredOperationInput) : {};
  } catch (error) {
    console.warn("Failed to restore operation input:", error);
    return {};
  }
}

function withValue(input: unknown, key: string, value: unknown): unknown {
  if (key === TOP_LEVEL_INPUT_KEY) return value;
  return typeof input === "object" && input !== null
    ? { ...input, [key]: value }
    : { [key]: value };
}

export function useOperationInput(
  venueId: string | undefined,
  assetId: string,
  schema?: OperationInputSchema,
): OperationInputController {
  const storageKey = `operation_input_${venueId ?? "unknown"}_${assetId}`;
  const readStored = useCallback(() => readStoredInput(storageKey), [storageKey]);
  // What this tab remembers for the operation: undefined until hydration, so
  // the server and the first client render agree on an unready form.
  const [stored] = useStoredValue(readStored);

  // Where this operation's draft starts: the remembered input, else the
  // schema's defaults.
  const seeded = useMemo<Draft | null>(() => {
    if (!schema || stored === undefined) return null;
    const defaults = defaultsFromOperationSchema(schema);
    return {
      key: storageKey,
      input: stored.input ?? defaults.input,
      rawInput: stored.rawInput ?? {},
      typeMap: stored.types ?? defaults.types,
    };
  }, [schema, stored, storageKey]);

  // Edits carry the key they were made under, so switching operation shows
  // that operation's own draft rather than resetting anything by hand.
  const [edits, setEdits] = useState<Draft | null>(null);
  const draft = edits && edits.key === storageKey ? edits : seeded;

  useEffect(() => {
    if (!draft) return;
    const hasInput =
      draft.input !== null &&
      draft.input !== undefined &&
      (typeof draft.input === "object" ? Object.keys(draft.input).length > 0 : true);
    if (!hasInput) return;

    try {
      sessionStorage.setItem(
        draft.key,
        JSON.stringify({ input: draft.input, rawInput: draft.rawInput, types: draft.typeMap }),
      );
    } catch (error) {
      console.warn("Failed to save operation input:", error);
    }
  }, [draft]);

  const edit = useCallback(
    (change: (current: Draft) => Draft) => {
      setEdits((previous) => {
        const current = previous && previous.key === storageKey ? previous : seeded;
        return current ? change(current) : previous;
      });
    },
    [seeded, storageKey],
  );

  const setValue = useCallback(
    (key: string, value: unknown) =>
      edit((current) => ({ ...current, input: withValue(current.input, key, value) })),
    [edit],
  );

  const setRawValue = useCallback(
    (key: string, value: string) =>
      edit((current) => ({ ...current, rawInput: { ...current.rawInput, [key]: value } })),
    [edit],
  );

  const setType = useCallback(
    (key: string, type: string) =>
      edit((current) => {
        const currentValue =
          key === TOP_LEVEL_INPUT_KEY
            ? current.input
            : typeof current.input === "object" && current.input !== null
              ? (current.input as Record<string, unknown>)[key]
              : undefined;
        const newRaw = printOperationInput(currentValue, type);
        // printOperationInput above only refreshes the displayed text — without
        // re-coercing it back through the new type, `input[key]` stays whatever
        // it was under the *previous* type, so the submitted payload silently
        // disagrees with what the type selector shows (covia-ai/frontend#271,
        // e.g. after: "90000" still sent as a string once switched to number).
        let input = current.input;
        try {
          input = withValue(current.input, key, parseOperationInput(newRaw, type));
        } catch {
          // Round-trip failed (e.g. an object-typed value that doesn't
          // stringify to valid JSON) — leave the existing coerced value as is.
        }
        return {
          ...current,
          input,
          rawInput: { ...current.rawInput, [key]: newRaw },
          typeMap: { ...current.typeMap, [key]: type },
        };
      }),
    [edit],
  );

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("Failed to clear operation input:", error);
    }
    setEdits({ key: storageKey, input: {}, rawInput: {}, typeMap: {} });
  }, [storageKey]);

  return {
    ready: draft !== null,
    input: draft?.input ?? EMPTY_INPUT,
    rawInput: draft?.rawInput ?? EMPTY_MAP,
    typeMap: draft?.typeMap ?? EMPTY_MAP,
    setValue,
    setRawValue,
    setType,
    reset,
  };
}
