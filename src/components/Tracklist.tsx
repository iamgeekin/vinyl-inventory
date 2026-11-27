import { useEffect, useState, type CSSProperties } from 'react';
import { groupBySide } from '../data/trackText';
import type { Track, VinylRecord } from '../data/types';
import type { Song } from '../preview/match';
import { albumPreviews, trackPreview, type AlbumPreviews } from '../preview/previews';
import { usePlayer } from '../preview/usePlayer';
import { PauseIcon, PlayIcon, SearchIcon } from './Icons';

type Lookup = { for: string; state: 'done'; result: AlbumPreviews } | { for: string; state: 'failed' };

export function Tracklist({ record }: { record: VinylRecord }) {
  const player = usePlayer();
  const signature = JSON.stringify([record.id, record.artist, record.title, record.tracklist]);
  const [lookup, setLookup] = useState<Lookup>();
  const [attempt, setAttempt] = useState(0);
  // Single tracks searched for by hand; null means none was found.
  const [extra, setExtra] = useState<Record<string, Song | null | 'searching'>>({});

  useEffect(() => {
    let live = true;
    albumPreviews(record).then(
      (result) => live && setLookup({ for: signature, state: 'done', result }),
      () => live && setLookup({ for: signature, state: 'failed' }),
    );
    return () => {
      live = false;
    };
    // The signature covers everything in the record that the search uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, attempt]);

  const current = lookup?.for === signature ? lookup : undefined;
  const result = current?.state === 'done' ? current.result : undefined;
  const songFor = (index: number): Song | null | 'searching' | undefined => {
    if (!result) return undefined;
    return result.songs[index] ?? extra[`${signature}:${index}`];
  };
  const available = result?.songs.filter(Boolean).length ?? 0;

  const findOne = async (index: number, track: Track) => {
    const key = `${signature}:${index}`;
    setExtra((e) => ({ ...e, [key]: 'searching' }));
    try {
      const song = await trackPreview({ title: track.title, artist: track.artist || record.artist });
      setExtra((e) => ({ ...e, [key]: song }));
      // May be refused by the phone after the wait; the button then plays it.
      if (song) player.toggle(index, song.previewUrl);
    } catch {
      setExtra(({ [key]: _, ...rest }) => rest);
    }
  };

  const query = encodeURIComponent(`${record.artist} ${record.title}`);
  const status = !current
    ? 'Looking for previews…'
    : current.state === 'failed'
      ? navigator.onLine ? 'Previews could not be loaded.' : 'Previews need a connection.'
      : player.status === 'failed'
        ? 'That preview could not be played.'
        : available === record.tracklist.length
          ? 'Tap a track for a 30-second preview.'
          : available
            ? `${available} of ${record.tracklist.length} tracks have a preview. Tap a magnifier to look for another.`
            : 'No album preview found. Tap a magnifier to look for a single track.';

  let position = 0;
  return (
    <div className="tracklist">
      <div className="previews">
        <p className="muted small" role="status">{status}</p>
        {current?.state === 'failed' && (
          <button type="button" className="button" onClick={() => { setLookup(undefined); setAttempt((n) => n + 1); }}>Try again</button>
        )}
        <p className="listen small">
          <a href={result?.albumLink || `https://music.apple.com/search?term=${query}`} target="_blank" rel="noreferrer">
            Listen on Apple Music
          </a>
          <a href={`https://open.spotify.com/search/${query}`} target="_blank" rel="noreferrer">Search on Spotify</a>
        </p>
        {(available > 0 || Object.values(extra).some((song) => song && song !== 'searching')) && (
          <p className="muted small">Previews provided courtesy of iTunes.</p>
        )}
      </div>

      {groupBySide(record.tracklist).map((group) => (
        <section key={`${group.side}-${position}`} className="side">
          <h2>{group.side}</h2>
          <ol>
            {group.tracks.map((track) => {
              const index = position++;
              const song = songFor(index);
              const active = player.index === index;
              const playing = active && (player.status === 'playing' || player.status === 'loading');
              return (
                <li key={index} className={active ? 'is-active' : undefined} style={active ? ({ '--progress': player.progress } as CSSProperties) : undefined}>
                  {song && song !== 'searching' ? (
                    <button
                      type="button"
                      className="play"
                      aria-label={`${playing ? 'Pause' : 'Play'} preview of ${track.title}`}
                      aria-pressed={playing}
                      onClick={() => player.toggle(index, song.previewUrl)}
                    >
                      {playing ? <PauseIcon /> : <PlayIcon />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="play find"
                      aria-label={song === null ? `No preview of ${track.title}` : `Look for a preview of ${track.title}`}
                      disabled={!result || song === null || song === 'searching'}
                      onClick={() => findOne(index, track)}
                    >
                      {song === null ? <span aria-hidden="true">–</span> : <SearchIcon />}
                    </button>
                  )}
                  <span className="muted pos">{track.position}</span>
                  <span className="track-title">
                    {track.title}
                    {track.artist && <span className="muted small"> — {track.artist}</span>}
                    {active && song && song !== 'searching' && (
                      <span className="muted small playing-from">From “{song.album}”</span>
                    )}
                  </span>
                  <span className="muted small">{track.duration}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
