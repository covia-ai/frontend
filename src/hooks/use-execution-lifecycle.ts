"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isJobFinished,
  type Asset,
  type JobMetadata,
  type RunStatus,
  type Venue,
} from "@covia/covia-sdk";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import { resolveOperationByAddress } from "@/lib/operations-catalog";
import { notifyError, notifySuccess } from "@/lib/notify";
import { errorMessage, isJobNotFoundError } from "@/lib/errors";

const POLL_INTERVAL_MS = 1000;

function parseJobMessage(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * What the transport has established about one job on one venue. Stored with
 * that identity and read back only while it is the one being viewed, so a
 * route change shows a fresh, loading job in the same render — nothing has to
 * be reset — and a late reply for the previous job has nowhere visible to land.
 */
type Lifecycle = {
  venue: Venue | undefined;
  jobId: string;
  job?: JobMetadata;
  error: string | null;
  /** The read found no such job: decided from the error itself, which `error`
   *  keeps only the message of (a malformed id's 400 names no status). */
  notFound: boolean;
  streaming: boolean;
};

/** The operation schema resolved for one job's `op` on one venue. */
type ResolvedOperation = { venue: Venue | undefined; op: string; asset?: Asset };

type MessageTarget = { venue: Venue; jobId: string };
type MessageDraft = { venue: Venue | undefined; jobId: string; text: string };

export function useExecutionLifecycle({
  venueId,
  jobId,
}: {
  venueId?: string;
  jobId: string;
}) {
  const { venue } = useResolvedVenueContext(venueId);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [resolved, setResolved] = useState<ResolvedOperation | null>(null);
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [pendingMessages, setPendingMessages] = useState<MessageTarget[]>([]);
  const pendingSendsRef = useRef<MessageTarget[]>([]);
  const lifecycleGeneration = useRef(0);
  const assetGeneration = useRef(0);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const current =
    lifecycle && lifecycle.venue === venue && lifecycle.jobId === jobId ? lifecycle : null;
  const job = current?.job;
  const error = current?.error ?? null;
  const streaming = current?.streaming ?? false;
  // Loading until the first metadata or the first failure lands for this job.
  const loading = !!venue && !!jobId && job === undefined && error === null;
  const operationAsset =
    resolved && resolved.venue === venue && resolved.op === job?.op ? resolved.asset : undefined;
  const message = draft?.venue === venue && draft?.jobId === jobId ? draft.text : "";
  const sendingMessage = pendingMessages.some((target) => target.venue === venue && target.jobId === jobId);
  const setMessage = useCallback((text: string) => {
    setDraft({ venue, jobId, text });
  }, [venue, jobId]);

  useEffect(() => {
    const lifecycleGen = lifecycleGeneration;
    const generation = ++lifecycleGen.current;
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollInFlight = false;
    let updateVersion = 0;
    let hasLoaded = false;
    // Nothing more can change: a terminal status, or a job that does not exist.
    let settled = false;
    // Aborting is what closes the SSE connection; a flag checked on the next
    // event would leave a quiet (e.g. PAUSED) job's stream open after unmount.
    const stream = new AbortController();

    const ownsLifecycle = () =>
      active && lifecycleGen.current === generation;

    // Every publication is filed under this effect's job, so it can only ever
    // update the entry the page is currently reading.
    const publish = (patch: Partial<Pick<Lifecycle, "job" | "error" | "notFound" | "streaming">>) =>
      setLifecycle((previous) => {
        const base =
          previous && previous.venue === venue && previous.jobId === jobId
            ? previous
            : { venue, jobId, job: undefined, error: null, notFound: false, streaming: false };
        return { ...base, ...patch };
      });

    const stopTransport = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      stream.abort();
      if (ownsLifecycle()) publish({ streaming: false });
    };

    const settle = () => {
      settled = true;
      stopTransport();
    };

    const applyMetadata = (metadata: JobMetadata) => {
      if (!ownsLifecycle()) return;
      hasLoaded = true;
      publish({ job: metadata, error: null, notFound: false });
      if (
        metadata.status &&
        isJobFinished(metadata.status as RunStatus)
      ) {
        settle();
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
        if (!ownsLifecycle()) return;
        // A missing job will not start existing: stop, rather than re-asking
        // every second for as long as the page stays open.
        const missing = isJobNotFoundError(fetchError);
        if (missing) settle();
        if (hasLoaded) return;
        publish({ error: errorMessage(fetchError, "Unable to load job"), notFound: missing });
      } finally {
        pollInFlight = false;
      }
    };
    refreshRef.current = fetchStatus;

    if (!venue || !jobId) {
      return () => {
        active = false;
        refreshRef.current = null;
      };
    }

    void fetchStatus();

    const startPolling = () => {
      if (pollTimer || settled || !ownsLifecycle()) return;
      publish({ streaming: false });
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
        for await (const event of venue.jobs.stream(jobId, { signal: stream.signal })) {
          if (!ownsLifecycle()) return;
          if (!gotEvent) {
            gotEvent = true;
            publish({ streaming: true });
          }
          try {
            const data = event.json() as any;
            ++updateVersion;
            applyMetadata((data.metadata ?? data) as JobMetadata);
          } catch {
            // Ignore malformed stream events; a later event can still recover.
          }
          if (settled || !ownsLifecycle()) return;
        }
      } catch {
        // Fall through to the reattach/fallback logic below.
      }
      if (!ownsLifecycle() || settled) return;
      publish({ streaming: false });
      if (isRetry) {
        startPolling();
        return;
      }
      await fetchStatus();
      if (!ownsLifecycle() || settled) return;
      void openStream(true);
    };

    void openStream(false);

    return () => {
      active = false;
      ++lifecycleGen.current;
      stopTransport();
      refreshRef.current = null;
    };
  }, [jobId, venue]);

  const op = job?.op;
  useEffect(() => {
    const assetRequests = assetGeneration;
    const generation = ++assetRequests.current;
    let active = true;
    if (!venue || !op) {
      return () => {
        active = false;
        ++assetRequests.current;
      };
    }

    void resolveOperationByAddress(venue, op)
      .then((asset) => {
        if (
          active &&
          assetRequests.current === generation
        ) {
          setResolved({ venue, op, asset });
        }
      })
      .catch(() => {
        // Schemas improve display only; job data remains usable without them.
      });

    return () => {
      active = false;
      ++assetRequests.current;
    };
  }, [op, venue]);

  const sendMessage = useCallback(async () => {
    if (!venue || !message.trim()) return;
    if (pendingSendsRef.current.some((target) => target.venue === venue && target.jobId === jobId)) return;
    const request = { venue, jobId };
    pendingSendsRef.current = [...pendingSendsRef.current, request];
    setPendingMessages(pendingSendsRef.current);
    // Capture this job's refresh. A late send must not refresh whichever job
    // the viewer happens to show after navigation.
    const refresh = refreshRef.current;
    try {
      await venue.jobs.sendMessage(jobId, parseJobMessage(message));
      notifySuccess("Message sent");
      // Clear only the submitted draft, preserving edits made while waiting.
      setDraft((currentDraft) => currentDraft === draft ? null : currentDraft);
      await refresh?.();
    } catch (err) {
      notifyError("Unable to send message", err, venue.baseUrl);
    } finally {
      pendingSendsRef.current = pendingSendsRef.current.filter((target) => target !== request);
      setPendingMessages(pendingSendsRef.current);
    }
  }, [draft, jobId, message, venue]);

  const notFound = current?.notFound ?? false;
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
