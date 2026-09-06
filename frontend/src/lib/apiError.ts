export function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message ?? fallback;
}

// For requests made with `responseType: "blob"` (e.g. a file download): axios
// still delivers a JSON error body as a Blob rather than a parsed object, so
// getApiErrorMessage can't read `.message` off it directly — this reads the
// blob's text and parses it first.
export async function getBlobApiErrorMessage(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.message === "string") return parsed.message;
    } catch {
      // Not JSON (or empty) — fall through to the generic message.
    }
  }
  return getApiErrorMessage(error, fallback);
}
