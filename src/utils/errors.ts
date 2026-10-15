// src/utils/errors.ts — one readable sentence from a failed API call. The API client
// rejects with { message, status, data }; validation failures carry data.errors.

type ApiFailure = {
  message?: string;
  status?: number;
  data?: { message?: string; errors?: Record<string, string[]> };
};

// A raw translation key ("validation.boolean") means the server had no message for it
const isRawKey = (text: string) => /^[a-z_]+\.[a-z_.]+$/i.test(text.trim());

/**
 * The server refused the program the app is working in (suspended, left, paused): expected,
 * the app re-reads the profile and shows why, so screens shouldn't report it as a bug.
 */
export function isProgramUnavailable(error: unknown): boolean {
  const failure = (error ?? {}) as ApiFailure & { data?: { programs?: unknown } };
  return failure.status === 409 && Array.isArray(failure.data?.programs);
}

/** console.error for a failed screen load, except the expected "program refused" above. */
export function logLoadError(label: string, error: unknown): void {
  if (isProgramUnavailable(error)) {
    console.warn(`${label} (no program to work in)`);
    return;
  }
  console.error(label, error);
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const failure = (error ?? {}) as ApiFailure;
  const fieldErrors = failure.data?.errors ?? {};
  const fields = Object.keys(fieldErrors);
  const message = failure.data?.message || failure.message || '';

  if (message && !isRawKey(message)) {
    return message;
  }
  if (fields.length > 0) {
    const first = fieldErrors[fields[0]]?.[0] ?? '';
    return isRawKey(first)
      ? `The server didn't accept "${fields.join('", "')}" (${first.split('.').pop()}).`
      : first;
  }
  return fallback;
}
