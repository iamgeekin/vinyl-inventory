import { useEffect, useRef, useState, type FormEvent } from 'react';
import { itunesByText } from '../../lookup/itunes';
import { searchReleases } from '../../lookup/lookup';
import { discogsByText } from '../../lookup/discogs';
import type { Candidate } from '../../lookup/types';
import { rankByImage } from '../../scan/imageRank';
import { queryPlan } from '../../scan/textClean';
import { makeThumbnail, type Thumbnail } from '../../scan/thumbnail';
import { useApp } from '../../state/AppContext';
import { Candidates } from './Candidates';
import { usePicker } from './usePicker';

interface State {
  photo: { blob: Blob; thumb: Thumbnail } | null;
  query: string;
  /** Albums that might be the one in the photo, best visual match first. */
  albums: Candidate[];
  /** Vinyl pressings of the album the user picked. */
  pressings: { album: Candidate; list: Candidate[] } | null;
}

let remembered: State = { photo: null, query: '', albums: [], pressings: null };

export function PhotoTab() {
  const { settings } = useApp();
  const [state, setState] = useState(remembered);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const { pick, busyKey, error } = usePicker({ photo: state.photo?.thumb });
  const update = (patch: Partial<State>) => setState((s) => (remembered = { ...s, ...patch }));
  useEffect(() => () => abort.current?.abort(), []);

  const begin = () => {
    abort.current?.abort();
    setBusy(true);
    return (abort.current = new AbortController());
  };

  /** Tries each query until one finds albums, then orders them by likeness to the photo. */
  const findAlbums = async (queries: string[], photo: Blob, signal: AbortSignal) => {
    for (const query of queries) {
      setStatus(`Searching for “${query}”…`);
      let found = await itunesByText(query, signal);
      if (!found.length) found = (await searchReleases(query, settings.discogsToken, signal)).candidates;
      if (found.length) {
        setStatus('Comparing the artwork…');
        const ranked = await rankByImage(photo, found.slice(0, 15), signal);
        update({ query, albums: ranked.map((r) => r.item), pressings: null });
        setStatus('');
        return;
      }
    }
    update({ albums: [], pressings: null });
    setStatus('No album matched. Correct the words below and search again.');
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const { signal } = begin();
    try {
      const thumb = await makeThumbnail(file);
      update({ photo: { blob: file, thumb }, query: '', albums: [], pressings: null });
      const { readCoverWords } = await import('../../scan/ocr');
      const words = await readCoverWords(file, setStatus);
      if (signal.aborted) return;
      if (!words.length) {
        setStatus('No readable text on this cover. Type the artist or album below.');
        return;
      }
      update({ query: words.join(' ') });
      await findAlbums(queryPlan(words), file, signal);
    } catch (e) {
      if (!signal.aborted) setStatus(`${(e as Error).message || 'The photo could not be read.'} You can type the name below.`);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };

  const searchAgain = async (event: FormEvent) => {
    event.preventDefault();
    if (!state.photo || !state.query.trim()) return;
    const { signal } = begin();
    try {
      await findAlbums([state.query.trim()], state.photo.blob, signal);
    } catch (e) {
      if (!signal.aborted) setStatus((e as Error).message);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };

  const chooseAlbum = async (album: Candidate) => {
    if (album.source !== 'itunes') return pick(album);
    const { signal } = begin();
    setStatus('Looking for vinyl pressings…');
    try {
      const plain = album.title.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+(Single|EP)$/i, '');
      const list = await discogsByText(`${album.artist} ${plain}`, settings.discogsToken, signal);
      if (!list.length) return await pick(album);
      update({ pressings: { album, list } });
      setStatus('');
    } catch (e) {
      if (!signal.aborted) {
        setStatus(`${(e as Error).message} Using the iTunes details instead.`);
        await pick(album);
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="row">
        <label className="button primary file">
          Take a photo
          <input type="file" accept="image/*" capture="environment" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <label className="button file">
          Choose a photo
          <input type="file" accept="image/*" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {!state.photo && (
        <p className="muted small">
          Fill the frame with the cover, straight on and without glare. The words on it are read on your phone, so covers with no text will not be recognised.
        </p>
      )}

      {state.photo && (
        <>
          <img className="cover photo-preview" src={state.photo.thumb.dataUrl} alt="Your cover photo" />
          <form className="row grow" onSubmit={searchAgain}>
            <input
              aria-label="Words read from the cover"
              placeholder="Artist or album"
              value={state.query}
              onChange={(e) => update({ query: e.target.value })}
            />
            <button type="submit" className="button" disabled={busy}>Search</button>
          </form>
        </>
      )}

      <p className="muted small" role="status">{status}</p>
      {error && <p className="error" role="alert">{error}</p>}

      {state.pressings ? (
        <>
          <h2 className="section-label">Which pressing is yours?</h2>
          <div className="row">
            <button type="button" className="button" onClick={() => update({ pressings: null })}>Back to albums</button>
            <button type="button" className="button" disabled={Boolean(busyKey)} onClick={() => pick(state.pressings!.album)}>
              Not listed
            </button>
          </div>
          <Candidates candidates={state.pressings.list} onPick={pick} busyKey={busyKey} />
        </>
      ) : (
        state.albums.length > 0 && (
          <>
            <h2 className="section-label">Best matches</h2>
            <Candidates candidates={state.albums} onPick={chooseAlbum} busyKey={busyKey || (busy ? 'busy' : '')} />
          </>
        )
      )}
    </div>
  );
}
