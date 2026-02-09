export async function fetchMutation<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const fallback = `Request failed with status ${res.status}`;

    if (typeof payload === "string") {
      throw new Error(payload || fallback);
    }

    const errorMessage =
      payload && typeof payload.error === "string" ? payload.error : fallback;

    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const fallback = `Request failed with status ${res.status}`;
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        throw new Error(fallback);
      }

      const parsedError =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : null;

      const errorMessage =
        typeof parsedError === "string" ? parsedError : fallback;
      throw new Error(errorMessage);
    }

    const payload = await res.text();
    if (payload.trim().length > 0) {
      throw new Error(payload);
    }

    throw new Error(fallback);
  }

  return (await res.json()) as T;
}
