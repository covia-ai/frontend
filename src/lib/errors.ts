type ErrorWithStatus = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  response?: { status?: unknown };
  cause?: unknown;
};

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
  if (
    candidate.status === 404 ||
    candidate.statusCode === 404 ||
    candidate.response?.status === 404 ||
    candidate.code === "NOT_FOUND"
  ) {
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
