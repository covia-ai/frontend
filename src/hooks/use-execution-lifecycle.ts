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

const POLL_INTERVAL_MS = 1000;

function parseJobMessage(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// Mirrors the notFound check in use-asset-details.ts / use-operation-asset.ts:
// JobNotFoundError's message ("Job not found: <id>") is told apart from a
// real failure by matching the message text, since useState/catch here
// flattens the thrown error to a string.
function isNotFound(message: string | null): boolean {
  return !!message && message.toLowerCase().includes("not found");
}

export function useExecutionLifecycle({
  venueId,
  jobId,
}: {
  venueId?: string;
  jobId: string;
}) {
  const { venue, auth } = useResolvedVenueContext(venueId);
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
    let source: EventSource | null = null;
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
      source?.close();
      source = null;
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
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load job",
        );
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

    // Native EventSource cannot attach bearer or Ed25519 authentication.
    if (auth) {
      startPolling();
    } else {
      try {
        source = new EventSource(
          `${venue.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}/sse`,
        );
        source.onopen = () => {
          if (ownsLifecycle()) setStreaming(true);
        };
        source.onmessage = (event) => {
          if (!ownsLifecycle()) return;
          try {
            const data = JSON.parse(event.data);
            ++updateVersion;
            applyMetadata((data.metadata ?? data) as JobMetadata);
          } catch {
            // Ignore malformed stream events; a later event can still recover.
          }
        };
        source.onerror = () => {
          if (!ownsLifecycle() || finished) return;
          source?.close();
          source = null;
          setStreaming(false);
          startPolling();
        };
      } catch {
        startPolling();
      }
    }

    return () => {
      active = false;
      ++lifecycle.current;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      refreshRef.current = null;
    };
  }, [auth, jobId, venue]);

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

  const notFound = isNotFound(error);
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
