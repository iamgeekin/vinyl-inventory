import { fetchJson, LookupError } from './http';
import { candidateFromItunes, draftFromItunes, type ItunesItem } from './mapRelease';
import type { Candidate, ReleaseDraft } from './types';

const API = 'https://itunes.apple.com';

async function request(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<ItunesItem[]> {
  const data = await fetchJson<{ results?: ItunesItem[] }>('iTunes', `${API}/${path}?${new URLSearchParams(params)}`, {
    signal,
  });
  return data.results ?? [];
}

export async function itunesByText(term: string, signal?: AbortSignal): Promise<Candidate[]> {
  const items = await request('search', { term, entity: 'album', limit: '15' }, signal);
  return items.map(candidateFromItunes);
}

export async function itunesByUpc(upc: string, signal?: AbortSignal): Promise<Candidate[]> {
  const items = await request('lookup', { upc, entity: 'album' }, signal);
  return items.filter((i) => i.wrapperType === 'collection').map(candidateFromItunes);
}

export async function itunesRelease(id: string, signal?: AbortSignal): Promise<ReleaseDraft> {
  const draft = draftFromItunes(await request('lookup', { id, entity: 'song', limit: '200' }, signal));
  if (!draft) throw new LookupError('iTunes no longer lists that album.');
  return draft;
}
