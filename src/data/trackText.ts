import type { Track } from './types';

/** One track per line: `A1 | Title | 4:12 | Track artist`. Only the title is required. */
export function formatTracks(tracks: Track[]): string {
  return tracks
    .map((t) => {
      const parts = [t.position, t.title, t.duration, t.artist];
      while (parts.length > 2 && !parts[parts.length - 1]) parts.pop();
      if (parts.length === 2 && !parts[0]) return parts[1];
      return parts.join(' | ');
    })
    .join('\n');
}

export function parseTracks(text: string): Track[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length === 1) return { position: '', title: parts[0], duration: '', artist: '' };
      const [position, title, duration = '', artist = ''] = parts;
      return { position, title, duration, artist };
    })
    .filter((t) => t.title);
}

/** Groups tracks by vinyl side using the letter that starts each position. */
export function groupBySide(tracks: Track[]): { side: string; tracks: Track[] }[] {
  const groups: { side: string; tracks: Track[] }[] = [];
  for (const track of tracks) {
    const letter = /^([A-Z]{1,2})(?=\d|$|[.-])/i.exec(track.position)?.[1].toUpperCase();
    const side = letter ? `Side ${letter}` : 'Tracks';
    const last = groups[groups.length - 1];
    if (last?.side === side) last.tracks.push(track);
    else groups.push({ side, tracks: [track] });
  }
  return groups;
}
