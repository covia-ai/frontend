"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isJobFinished,
  type Asset,
  type JobMetadata,
  type RunStatus,
} from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { notifyError, notifySuccess } from "@/lib/notify";
import { errorMessage, isNotFoundError } from "@/lib/errors";

const POLL_INTERVAL_MS = 1000;

function parseJobMessage(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function useExecutionLifecycle({
  venueId,
  jobId,
}: {
  venueId?: string;
  jobId: string;
}) {
  const { venue } = useResolvedVenueContext(venueId);
  const [job, setJob] = useState<JobMetadata>();
  const [operationAsset, setOperationAsset] = useState<Asset>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const lifecycleGeneration = useRef(0);
  const assetGeneration = useRef(0);
  const sendGeneration = useRef(0);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const lifecycle = lifecycleGeneration;
    const generation = ++lifecycle.current;
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollInFlight = false;
    let updateVersion = 0;
    let hasLoaded = false;
    let finished = false;

    setJob(undefined);
    setOperationAsset(undefined);
    setLoading(true);
    setError(null);
    setStreaming(false);

    const ownsLifecycle = () =>
      active && lifecycle.current === generation;

    const stopTransport = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      if (ownsLifecycle()) setStreaming(false);
    };

    const applyMetadata = (metadata: JobMetadata) => {
      if (!ownsLifecycle()) return;
      hasLoaded = true;
      setJob(metadata);
      setLoading(false);
      setError(null);
      if (
        metadata.status &&
        isJobFinished(metadata.status as RunStatus)
      ) {
        finished = true;
        stopTransport();
      }
    };

    const fetchStatus = async () => {
      if (!venue || !jobId || pollInFlight || !ownsLifecycle()) return;
      pollInFlight = true;
      const versionAtStart = updateVersion;
      try {
        const result = await venue.jobs.get(jobId);
        if (!ownsLifecycle() || versionAtStart !== updateVersion) return;
        ++updateVersion;
        applyMetadata(result.metadata);
      } catch (fetchError: unknown) {
        if (!ownsLifecycle() || hasLoaded) return;
        setLoading(false);
        setError(errorMessage(fetchError, "Unable to load job"));
      } finally {
        pollInFlight = false;
      }
    };
    refreshRef.current = fetchStatus;

    if (!venue || !jobId) {
      setLoading(false);
      return () => {
        active = false;
        refreshRef.current = null;
      };
    }

    void fetchStatus();

    const startPolling = () => {
      if (pollTimer || finished || !ownsLifecycle()) return;
      setStreaming(false);
      pollTimer = setInterval(() => {
        void fetchStatus();
      }, POLL_INTERVAL_MS);
    };

    // venue.jobs.stream() carries the venue's configured auth header (bearer
    // or Ed25519) over fetch/ReadableStream — unlike native EventSource,
    // which can't attach one — so it works for signed-in and anonymous
    // callers alike. A drop gets one reattach (fresh GET, then reopen); a
    // second drop, or a venue that rejects the stream outright (e.g. an
    // older venue without the SSE route), falls back to polling.
    const openStream = async (isRetry: boolean) => {
      try {
        let gotEvent = false;
        for await (const event of venue.jobs.stream(jobId)) {
          if (!ownsLifecycle()) return;
          if (!gotEvent) {
            gotEvent = true;
            setStreaming(true);
          }
          try {
            const data = event.json() as any;
            ++updateVersion;
            applyMetadata((data.metadata ?? data) as JobMetadata);
          } catch {
            // Ignore malformed stream events; a later event can still recover.
          }
          if (finished || !ownsLifecycle()) return;
        }
      } catch {
        // Fall through to the reattach/fallback logic below.
      }
      if (!ownsLifecycle() || finished) return;
      setStreaming(false);
      if (isRetry) {
        startPolling();
        return;
      }
      await fetchStatus();
      if (!ownsLifecycle() || finished) return;
      void openStream(true);
    };

    void openStream(false);

    return () => {
      active = false;
      ++lifecycle.current;
      if (pollTimer) clearInterval(pollTimer);
      refreshRef.current = null;
    };
  }, [jobId, venue]);

  useEffect(() => {
    const assetRequests = assetGeneration;
    const generation = ++assetRequests.current;
    let active = true;
    setOperationAsset(undefined);
    if (!venue || !job?.operation) {
      return () => {
        active = false;
        ++assetRequests.current;
      };
    }

    void resolveOperationByAddress(venue, job.operation)
      .then((asset) => {
        if (
          active &&
          assetRequests.current === generation
        ) {
          setOperationAsset(asset);
        }
      })
      .catch(() => {
        // Schemas improve display only; job data remains usable without them.
      });

    return () => {
      active = false;
      ++assetRequests.current;
    };
  }, [job?.operation, venue]);

  useEffect(
    () => () => {
      ++sendGeneration.current;
    },
    [jobId, venue],
  );

  const sendMessage = useCallback(async () => {
    if (!venue || !message.trim()) return;
    const generation = ++sendGeneration.current;
    setSendingMessage(true);
    try {
      await venue.jobs.sendMessage(jobId, parseJobMessage(message));
      notifySuccess("Message sent");
      if (sendGeneration.current === generation) setMessage("");
      await refreshRef.current?.();
    } catch (err) {
      notifyError("Unable to send message", err, venue.baseUrl);
    } finally {
      if (sendGeneration.current === generation) {
        setSendingMessage(false);
      }
    }
  }, [jobId, message, venue]);

  const notFound = isNotFoundError(error);
  return {
    venue,
    job,
    operationAsset,
    loading,
    error: notFound ? null : error,
    notFound,
    streaming,
    message,
    setMessage,
    sendingMessage,
    sendMessage,
    refresh: () => refreshRef.current?.(),
  };
}
