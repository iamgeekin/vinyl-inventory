import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleRecords } from '../src/data/sample';
import { emptyRecord, type VinylRecord } from '../src/data/types';
import { discogsCollection, type Wait } from '../src/discogs/collection';
import { planSync, sendMissing, type Missing } from '../src/discogs/plan';
import { LookupError } from '../src/lookup/http';
import { discogsMatches } from '../src/lookup/lookup';

const record = (title: string, discogsId: number | null): VinylRecord => ({
  ...emptyRecord(),
  artist: 'A',
  title,
  links: { discogsId, mbid: '', coverUrl: '' },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noWait: Wait = async () => {};

afterEach(() => vi.unstubAllGlobals());

describe('what to send', () => {
  it('adds only the copies Discogs does not have', () => {
    const records = [record('Have', 1), record('Need', 2), record('Twice', 3), record('Twice', 3), record('No link', null)];
    const plan = planSync(records, new Map([[1, 2], [3, 1], [99, 1]]));
    expect(plan.toAdd.map((i) => [i.releaseId, i.copies])).toEqual([[2, 1], [3, 1]]);
    expect(plan.alreadyThere).toBe(2);
    expect(plan.unlinked.map((r) => r.title)).toEqual(['No link']);
  });

  it('leaves out sample records', () => {
    const plan = planSync(sampleRecords('USD'), new Map());
    expect(plan).toEqual({ toAdd: [], alreadyThere: 0, unlinked: [] });
  });
});

describe('sending', () => {
  const items: Missing[] = [1, 2, 3].map((id) => ({ releaseId: id, record: record(`R${id}`, id), copies: 1 }));
  const run = (add: (id: number) => Promise<void>, signal = new AbortController().signal) =>
    sendMissing(items, add, signal, () => {});

  it('sends every missing copy', async () => {
    const sent: number[] = [];
    const result = await sendMissing(
      [{ ...items[0], copies: 2 }, items[1]],
      async (id) => void sent.push(id),
      new AbortController().signal,
      () => {},
    );
    expect(sent).toEqual([1, 1, 2]);
    expect(result).toEqual({ added: 3, failed: [], problem: '' });
  });

  it('carries on past a release Discogs no longer has', async () => {
    const result = await run(async (id) => {
      if (id === 2) throw new LookupError('Discogs returned an error (404).', 404);
    });
    expect(result.added).toBe(2);
    expect(result.failed.map((f) => f.item.releaseId)).toEqual([2]);
  });

  it('stops without repeating a request that may have got through', async () => {
    const add = vi.fn(async () => {
      throw new LookupError('Could not reach Discogs. Try again.');
    });
    const result = await run(add);
    expect(add).toHaveBeenCalledTimes(1);
    expect(result.problem).toContain('may or may not have been added');
  });

  it('stops on a rejected token', async () => {
    const result = await run(async () => {
      throw new LookupError('Discogs rejected the token.', 401);
    });
    expect(result.problem).toBe('Discogs rejected the token.');
  });

  it('counts the request in flight when the user stops', async () => {
    const controller = new AbortController();
    const result = await run(async () => controller.abort(), controller.signal);
    expect(result).toEqual({ added: 1, failed: [], problem: '' });
  });
});

describe('Discogs collection requests', () => {
  it('reads every page and counts copies', async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) => {
      const page = Number(new URL(url).searchParams.get('page'));
      const ids = page === 1 ? [5, 5] : [6];
      return json({ pagination: { pages: 2 }, releases: ids.map((id) => ({ id, basic_information: { id } })) });
    });
    vi.stubGlobal('fetch', fetch);
    const owned = await discogsCollection('t', { wait: noWait }).ownedCopies('some one');
    expect([...owned]).toEqual([[5, 2], [6, 1]]);
    expect(fetch.mock.calls[0][0]).toContain('/users/some%20one/collection/folders/0/releases');
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { Authorization: 'Discogs token=t' } });
  });

  it('does not take an unexpected reply for an empty collection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({})));
    await expect(discogsCollection('t', { wait: noWait }).ownedCopies('u')).rejects.toThrow('unexpected reply');
  });

  it('adds to the Uncategorized folder', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => json({ instance_id: 1 }, 201));
    vi.stubGlobal('fetch', fetch);
    await discogsCollection('t', { wait: noWait }).add('u', 42);
    expect(fetch.mock.calls[0][0]).toBe('https://api.discogs.com/users/u/collection/folders/1/releases/42');
    expect(fetch.mock.calls[0][1]?.method).toBe('POST');
  });

  it('waits and tries again when told it is too fast', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 429)).mockResolvedValue(json({}, 201));
    vi.stubGlobal('fetch', fetch);
    const onPause = vi.fn();
    await discogsCollection('t', { wait: noWait, onPause }).add('u', 1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('does not retry an add after a server error', async () => {
    const fetch = vi.fn(async () => json({}, 500));
    vi.stubGlobal('fetch', fetch);
    await expect(discogsCollection('t', { wait: noWait }).add('u', 1)).rejects.toMatchObject({ status: 500 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('spaces requests out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ username: 'u' })));
    const wait = vi.fn(noWait);
    const discogs = discogsCollection('t', { wait });
    await discogs.username();
    await discogs.username();
    expect(wait.mock.calls.at(-1)?.[0]).toBeGreaterThan(900);
  });

  it('sends nothing once stopped', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(discogsCollection('t', { wait: noWait }).add('u', 1, AbortSignal.abort())).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('finding the pressing', () => {
  it('searches by barcode first, then by name', async () => {
    const fetch = vi.fn(async (url: string) =>
      json({ results: url.includes('barcode=') ? [] : [{ id: 9, title: 'A - T', format: ['Vinyl'] }] }),
    );
    vi.stubGlobal('fetch', fetch);
    const found = await discogsMatches({ artist: 'A', title: 'T', barcode: '5012394144777' }, 't');
    expect(fetch.mock.calls[0][0]).toContain('barcode=5012394144777');
    expect(found.candidates.map((c) => c.id)).toEqual(['9']);
  });
});
