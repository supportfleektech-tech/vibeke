/** Error carrying the HTTP status so callers can branch on 401/403/429 without parsing text. */
export class FetchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new FetchError(r.status, `${url} failed ${r.status}`);
    return r.json();
  });

export async function fetchJsonSafe<T>(
  url: string,
  fallback: T
): Promise<{ data: T; nextCursor?: string | null; ok: boolean; error?: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { data: fallback, ok: false, error: `${url} failed ${res.status} ${text.slice(0, 100)}` };
    }
    const json = await res.json().catch(() => null);
    if (!json) return { data: fallback, ok: false, error: `${url} invalid JSON` };
    const nextCursor = ((json as unknown as Record<string, unknown>)?.nextCursor as string | null) ?? null;
    return { data: json as T, nextCursor, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: fallback, ok: false, error: msg };
  }
}
