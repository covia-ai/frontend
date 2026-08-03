"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

type QueryLoader<T> = (
  publish: (data: T, options?: { loading?: boolean }) => void,
) => Promise<T>;

type RunOptions = {
  clear?: boolean;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
    });
  }, []);

  const run = useCallback(
    async (loader: QueryLoader<T>, options: RunOptions = {}) => {
      const requestId = ++generation.current;
      setState((previous) => ({
        data: options.clear ? initialDataRef.current : previous.data,
        loading: true,
        error: null,
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
        }));
      };

      try {
        const data = await loader(publish);
        if (requestId === generation.current) {
          setState({ data, loading: false, error: null });
        }
      } catch (error: unknown) {
        if (requestId === generation.current) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: errorMessage(error),
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
