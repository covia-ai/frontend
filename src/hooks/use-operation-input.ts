"use client";

import { useCallback, useEffect, useState } from "react";
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

function readStoredInput(storageKey: string): StoredOperationInput {
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredOperationInput) : {};
  } catch (error) {
    console.warn("Failed to restore operation input:", error);
    return {};
  }
}

export function useOperationInput(
  venueId: string | undefined,
  assetId: string,
  schema?: OperationInputSchema,
): OperationInputController {
  const [input, setInput] = useState<unknown>({});
  const [rawInput, setRawInput] = useState<Record<string, string>>({});
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});
  const [initializedKey, setInitializedKey] = useState<string | null>(null);
  const storageKey = `operation_input_${venueId ?? "unknown"}_${assetId}`;

  useEffect(() => {
    if (!schema) return;
    const stored = readStoredInput(storageKey);
    const defaults = defaultsFromOperationSchema(schema);
    setInput(stored.input ?? defaults.input);
    setRawInput(stored.rawInput ?? {});
    setTypeMap(stored.types ?? defaults.types);
    setInitializedKey(storageKey);
  }, [schema, storageKey]);

  useEffect(() => {
    if (initializedKey !== storageKey) return;
    const hasInput =
      input !== null &&
      input !== undefined &&
      (typeof input === "object" ? Object.keys(input).length > 0 : true);
    if (!hasInput) return;

    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ input, rawInput, types: typeMap }),
      );
    } catch (error) {
      console.warn("Failed to save operation input:", error);
    }
  }, [initializedKey, input, rawInput, storageKey, typeMap]);

  const setValue = useCallback((key: string, value: unknown) => {
    if (key === TOP_LEVEL_INPUT_KEY) {
      setInput(value);
      return;
    }
    setInput((previous: unknown) =>
      typeof previous === "object" && previous !== null
        ? { ...previous, [key]: value }
        : { [key]: value },
    );
  }, []);

  const setRawValue = useCallback((key: string, value: string) => {
    setRawInput((previous) => ({ ...previous, [key]: value }));
  }, []);

  const setType = useCallback(
    (key: string, type: string) => {
      setTypeMap((previous) => ({ ...previous, [key]: type }));
      const currentValue =
        key === TOP_LEVEL_INPUT_KEY
          ? input
          : typeof input === "object" && input !== null
            ? (input as Record<string, unknown>)[key]
            : undefined;
      const newRaw = printOperationInput(currentValue, type);
      setRawInput((previous) => ({ ...previous, [key]: newRaw }));
      // printOperationInput above only refreshes the displayed text — without
      // re-coercing it back through the new type, `input[key]` stays whatever
      // it was under the *previous* type, so the submitted payload silently
      // disagrees with what the type selector shows (covia-ai/frontend#271,
      // e.g. after: "90000" still sent as a string once switched to number).
      try {
        setValue(key, parseOperationInput(newRaw, type));
      } catch {
        // Round-trip failed (e.g. an object-typed value that doesn't
        // stringify to valid JSON) — leave the existing coerced value as is.
      }
    },
    [input, setValue],
  );

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("Failed to clear operation input:", error);
    }
    setInput({});
    setRawInput({});
    setTypeMap({});
  }, [storageKey]);

  return {
    ready: initializedKey === storageKey,
    input,
    rawInput,
    typeMap,
    setValue,
    setRawValue,
    setType,
    reset,
  };
}
