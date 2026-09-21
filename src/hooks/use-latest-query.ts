"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";

type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  /**
   * True once a run has actually published data. `loading` alone cannot tell a
   * caller whether `data` is an answer or a placeholder, so a count of 0 reads
   * as "none" while the first read is still in flight. Consumers that render a
   * number, a total or a status should hold it back until this is true.
   */
  settled: boolean;
};

type QueryLoader<T> = (
  publish: (data: T, options?: { loading?: boolean }) => void,
) => Promise<T>;

type RunOptions = {
  clear?: boolean;
};

/**
 * Runs async reads with latest-request-wins semantics. Older requests may
 * finish, but they cannot publish data, errors, or loading state after a newer
 * request starts or the owning component invalidates the query.
 */
export function useLatestQuery<T>(
  initialData: T,
  options: { initialLoading?: boolean } = {},
) {
  const initialDataRef = useRef(initialData);
  const generation = useRef(0);
  const [state, setState] = useState<QueryState<T>>({
    data: initialData,
    loading: options.initialLoading ?? false,
    error: null,
    settled: false,
  });

  const invalidate = useCallback(() => {
    ++generation.current;
  }, []);

  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );

  const reset = useCallback((data?: T) => {
    ++generation.current;
    setState({
      data: data ?? initialDataRef.current,
      loading: false,
      error: null,
      // Reset to the placeholder is not an answer; reset to supplied data is.
      settled: data !== undefined,
    });
  }, []);

  const run = useCallback(
    async (loader: QueryLoader<T>, options: RunOptions = {}) => {
      const requestId = ++generation.current;
      setState((previous) => ({
        data: options.clear ? initialDataRef.current : previous.data,
        loading: true,
        error: null,
        // A refresh that keeps the previous data keeps its answer; one that
        // clears back to the placeholder has nothing to show again.
        settled: options.clear ? false : previous.settled,
      }));

      const publish = (
        data: T,
        publishOptions?: { loading?: boolean },
      ) => {
        if (requestId !== generation.current) return;
        setState((previous) => ({
          ...previous,
          data,
          loading: publishOptions?.loading ?? previous.loading,
          settled: true,
        }));
      };

      try {
        const data = await loader(publish);
        if (requestId === generation.current) {
          setState({ data, loading: false, error: null, settled: true });
        }
      } catch (error: unknown) {
        if (requestId === generation.current) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: errorMessage(error),
            // A failed read produced no answer: leave `settled` as it was, so a
            // first-load failure shows the error rather than a confident zero.
          }));
        }
      }
    },
    [],
  );

  return {
    ...state,
    run,
    reset,
    invalidate,
  };
}
