import { fetchJson, LookupError } from '../lookup/http';

// Reads and adds to the token owner's own Discogs collection.

const API = 'https://api.discogs.com';
/** Discogs allows about 60 requests a minute with a token. */
const SPACING = 1100;
const COOL_DOWN = 60_000;
const RETRIES = 2;
/** New releases go to "Uncategorized". Folder 0 lists everything and cannot be added to. */
const ADD_FOLDER = 1;

export type Wait = (ms: number, signal?: AbortSignal) => Promise<void>;

export const sleep: Wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const stop = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', stop);
      resolve();
    }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });

// One request at a time across the app, so a new check never overtakes an add still on its way.
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

interface Options {
  wait?: Wait;
  /** Called when Discogs asks the app to slow down and it is about to pause. */
  onPause?: () => void;
}

interface CollectionPage {
  pagination?: { pages?: number };
  releases?: { id?: number; basic_information?: { id?: number } }[];
}

export function discogsCollection(token: string, { wait = sleep, onPause }: Options = {}) {
  const headers = { Authorization: `Discogs token=${token}` };

  /** `signal` ends any waiting. It only cuts off a request already sent if `init` carries it too. */
  function request<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
    const run = async () => {
      for (let attempt = 0; ; attempt++) {
        const gap = lastRequest + SPACING - Date.now();
        if (gap > 0) await wait(gap, signal);
        signal?.throwIfAborted();
        lastRequest = Date.now();
        try {
          return await fetchJson<T>('Discogs', url, { ...init, headers });
        } catch (e) {
          // Only a refusal for being too fast is certain to have changed nothing.
          if (!(e instanceof LookupError) || e.status !== 429 || attempt >= RETRIES) throw e;
          onPause?.();
          await wait(COOL_DOWN, signal);
        }
      }
    };
    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
  }

  // The browser must not answer from its cache, or a release just added would look missing.
  const read = <T>(url: string, signal?: AbortSignal) => request<T>(url, { signal, cache: 'no-store' }, signal);

  return {
    async username(signal?: AbortSignal): Promise<string> {
      const me = await read<{ username?: string }>(`${API}/oauth/identity`, signal);
      if (!me.username) throw new LookupError('Discogs did not say whose token this is.');
      return me.username;
    },

    /** How many copies of each release the collection holds, across all folders. */
    async ownedCopies(
      username: string,
      signal?: AbortSignal,
      onPage?: (page: number, pages: number) => void,
    ): Promise<Map<number, number>> {
      const owned = new Map<number, number>();
      const base = `${API}/users/${encodeURIComponent(username)}/collection/folders/0/releases?per_page=100`;
      for (let page = 1, pages = 1; page <= pages; page++) {
        const data = await read<CollectionPage>(`${base}&page=${page}`, signal);
        // A reply of the wrong shape must not pass for an empty collection.
        if (!Array.isArray(data.releases)) throw new LookupError('Discogs sent an unexpected reply. Try again.');
        pages = data.pagination?.pages ?? 1;
        for (const item of data.releases) {
          const id = item.basic_information?.id ?? item.id;
          if (id) owned.set(id, (owned.get(id) ?? 0) + 1);
        }
        onPage?.(page, pages);
      }
      return owned;
    },

    /** Adds one copy. Once sent, the request is left to finish even if `signal` is aborted. */
    async add(username: string, releaseId: number, signal?: AbortSignal): Promise<void> {
      const url = `${API}/users/${encodeURIComponent(username)}/collection/folders/${ADD_FOLDER}/releases/${releaseId}`;
      await request(url, { method: 'POST' }, signal);
    },
  };
}
