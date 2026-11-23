type ErrorWithStatus = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  response?: { status?: unknown };
  cause?: unknown;
};

export function errorStatus(error: unknown): number | undefined {
  if (typeof error === "string") {
    const match = error.match(/\b(?:HTTP\s*)?(\d{3})\b/i);
    return match ? Number(match[1]) : undefined;
  }
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as ErrorWithStatus;
  const status = candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  if (typeof status === "number") return status;
  if (typeof candidate.message === "string") return errorStatus(candidate.message);
  return candidate.cause !== error ? errorStatus(candidate.cause) : undefined;
}

export function isAuthenticationRejectedError(error: unknown): boolean {
  const status = errorStatus(error);
  return status === 401 || status === 403;
}

export function errorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") {
    const normalized = error.toLowerCase();
    return normalized.includes("not found") || /\b404\b/.test(normalized);
  }
  if (typeof error !== "object") return false;

  const candidate = error as ErrorWithStatus;
  if (errorStatus(error) === 404 || candidate.code === "NOT_FOUND") {
    return true;
  }
  if (typeof candidate.name === "string" && candidate.name.toLowerCase().includes("notfound")) {
    return true;
  }
  if (typeof candidate.message === "string" && isNotFoundError(candidate.message)) {
    return true;
  }
  return candidate.cause !== error && isNotFoundError(candidate.cause);
}

// A job read that will never find the job: no such job (404), or an id the
// venue cannot parse, which it answers with 400 since covia 0.11 ("Job request
// requires a job ID as a valid hex string"). Only for job-by-id reads, where
// the id is the only input a 400 can be about.
export function isJobNotFoundError(error: unknown): boolean {
  return isNotFoundError(error) || errorStatus(error) === 400;
}
