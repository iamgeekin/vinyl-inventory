import { describe, expect, it } from 'vitest';
import { matchTracks, sameArtist, trackKey, type Song } from '../src/preview/match';
import { rankAlbums, storefronts } from '../src/preview/previews';

const song = (title: string, artist = 'Fleetwood Mac', album = 'Rumours'): Song => ({
  title, artist, album, previewUrl: `https://audio.example/${title}`, link: '',
});

describe('track titles', () => {
  it('ignores additions that are the same recording', () => {
    const plain = trackKey('Dreams');
    for (const title of ['Dreams - 2004 Remaster', 'Dreams (Remastered 2013)', 'Dreams (Album Version)', 'DREAMS [Mono]', 'Dreams (feat. Someone)', 'Dreams feat. Someone']) {
      expect(trackKey(title), title).toBe(plain);
    }
  });

  it('keeps versions apart', () => {
    const plain = trackKey('Dreams');
    for (const title of ['Dreams (Live)', 'Dreams - Demo', 'Dreams (Instrumental)', 'Dreams (Club Remix)', 'Dreams (Take 2)']) {
      expect(trackKey(title), title).not.toBe(plain);
    }
    expect(trackKey('Dreams (Live)')).toBe(trackKey('Dreams - Live'));
  });

  it('copes with brackets at the start and other scripts', () => {
    expect(trackKey('(Don’t Fear) The Reaper')).toBe(trackKey("(Don't Fear) The Reaper - Remastered"));
    expect(trackKey('夜の海')).toBe('夜の海');
  });
});

describe('matching previews', () => {
  it('pairs tracks by title and artist, in any order', () => {
    const result = matchTracks(
      [{ title: 'Dreams', artist: 'Fleetwood Mac' }, { title: 'The Chain', artist: 'Fleetwood Mac' }, { title: 'Missing', artist: 'Fleetwood Mac' }],
      [song('The Chain - 2004 Remaster'), song('Dreams (Live)'), song('Dreams')],
    );
    expect(result.map((s) => s?.title ?? null)).toEqual(['Dreams', 'The Chain - 2004 Remaster', null]);
  });

  it('refuses another artist’s song and songs without a clip', () => {
    expect(matchTracks([{ title: 'Dreams', artist: 'Fleetwood Mac' }], [song('Dreams', 'The Cranberries')])).toEqual([null]);
    expect(matchTracks([{ title: 'Dreams', artist: 'Fleetwood Mac' }], [{ ...song('Dreams'), previewUrl: '' }])).toEqual([null]);
  });

  it('gives repeated titles different clips', () => {
    const [first, second] = [song('Interlude'), { ...song('Interlude'), previewUrl: 'second' }];
    const wanted = { title: 'Interlude', artist: 'Fleetwood Mac' };
    expect(matchTracks([wanted, wanted], [first, second])).toEqual([first, second]);
  });

  it('handles articles, featured artists and compilations', () => {
    expect(sameArtist('The Beatles', 'Beatles')).toBe(true);
    expect(sameArtist('Someone', 'Someone & Guest')).toBe(true);
    expect(sameArtist('Various', 'Anybody')).toBe(true);
    expect(sameArtist('', 'Anybody')).toBe(false);
  });
});

describe('choosing the album', () => {
  const album = (collectionName: string, artistName = 'Fleetwood Mac') => ({ collectionName, artistName });
  const record = { artist: 'Fleetwood Mac', title: 'Rumours' };

  it('prefers the exact title and leaves out live and unrelated albums', () => {
    const ranked = rankAlbums([album('Rumours (Deluxe Edition)'), album('Rumours (Live)'), album('Rumours'), album('Tusk'), album('Rumours', 'Tribute Band')], record);
    expect(ranked.map((a) => a.collectionName)).toEqual(['Rumours', 'Rumours (Deluxe Edition)']);
  });

  it('keeps a live album when the record is live', () => {
    expect(rankAlbums([album('Rumours (Live)')], { ...record, title: 'Rumours Live' })).toHaveLength(0);
    expect(rankAlbums([album('Rumours (Live)')], { ...record, title: 'Rumours (Live)' })).toHaveLength(1);
  });

  it('tries the local store before the US one', () => {
    expect(storefronts('en-SG')).toEqual(['SG', 'US']);
    expect(storefronts('en-US')).toEqual(['US']);
    expect(storefronts('en')).toEqual(['US']);
  });
});
