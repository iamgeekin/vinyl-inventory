export class LookupError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'LookupError';
    this.status = status;
  }
}

export async function fetchJson<T>(service: string, url: string, init: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (e) {
    if (init.signal?.aborted) throw e;
    throw new LookupError(
      navigator.onLine === false ? 'You are offline.' : `Could not reach ${service}. Try again.`,
    );
  }
  if (!response.ok) {
    if (response.status === 401) throw new LookupError(`${service} rejected the token. Check it in Settings.`, 401);
    if (response.status === 429 || response.status === 503) {
      throw new LookupError(`${service} is busy or rate limited. Wait a minute and try again.`, response.status);
    }
    throw new LookupError(`${service} returned an error (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}
