import { normalizeText } from '../lookup/text';

export interface Song {
  title: string;
  artist: string;
  album: string;
  previewUrl: string;
  /** The track's page on Apple Music. */
  link: string;
}

export interface Wanted {
  title: string;
  artist: string;
}

// Additions in a title that do not make it a different recording.
const SAME_RECORDING = [
  /^(\d{4} )?(digital )?(digitally )?remaster(ed)?( \d{4})?( version)?$/,
  /^(\d{4} )?(mono|stereo)( (version|mix))?$/,
  /^(album|single|original|explicit|clean)( version)?$/,
  /^bonus track$/,
  /^(feat|ft|featuring) /,
];

/**
 * Reduces a title to its name plus anything that marks a different version, so
 * that "Dreams - 2004 Remaster" matches "Dreams" but "Dreams (Live)" does not.
 */
export function trackKey(title: string): string {
  const extras: string[] = [];
  const unbracketed = title.replace(/[([]([^)\]]*)[)\]]/g, (_, inside: string) => {
    extras.push(inside);
    return ' ';
  });
  const [name, ...dashed] = unbracketed.split(/\s+[-–—]\s+/);
  const versions = [...extras, ...dashed]
    .map(normalizeText)
    .filter((extra) => extra && !SAME_RECORDING.some((pattern) => pattern.test(extra)))
    .sort();
  const main = normalizeText(name.replace(/\s+(feat\.?|ft\.|featuring)\s.*$/i, ''));
  return [main, ...versions].join('|');
}

const plainArtist = (name: string) => normalizeText(name).replace(/^(the|a|an) /, '');

export function sameArtist(wanted: string, found: string): boolean {
  const [a, b] = [plainArtist(wanted), plainArtist(found)];
  if (!a || !b) return false;
  // Compilations are listed under "Various", which no single track artist matches.
  return a.startsWith('various') || a.includes(b) || b.includes(a);
}

/** Pairs each wanted track with a song, or null. Songs earlier in the list win. */
export function matchTracks(wanted: Wanted[], songs: Song[]): (Song | null)[] {
  const used = new Set<Song>();
  return wanted.map((track) => {
    const key = trackKey(track.title);
    if (!key) return null;
    const matches = songs.filter((s) => s.previewUrl && trackKey(s.title) === key && sameArtist(track.artist, s.artist));
    const match = matches.find((s) => !used.has(s)) ?? matches[0] ?? null;
    if (match) used.add(match);
    return match;
  });
}
