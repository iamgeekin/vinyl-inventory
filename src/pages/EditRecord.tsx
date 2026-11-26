import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CoverImage, useCoverSrc } from '../components/Cover';
import type { CoverChange } from '../data/repository';
import { formatTracks, parseTracks } from '../data/trackText';
import { CURRENCIES, emptyRecord, GRADES, type Grade, type VinylRecord } from '../data/types';
import { findOwned } from '../lookup/lookup';
import { findArtwork } from '../scan/artwork';
import { makeThumbnail, type Thumbnail } from '../scan/thumbnail';
import { useApp } from '../state/AppContext';
import { useCoverTheme } from '../theme/ThemeContext';
import { useRecordColors } from '../theme/useRecordColors';

export interface NewRecordState {
  draft?: Partial<VinylRecord>;
  /** The user's own cover photo, as a thumbnail. */
  photo?: Thumbnail;
}

export function EditRecord() {
  const { id } = useParams();
  const location = useLocation();
  const { records, ready, settings } = useApp();
  const incoming = (location.state ?? {}) as NewRecordState;
  const [fresh] = useState<VinylRecord>(() => {
    const base = emptyRecord(settings.currency);
    return { ...base, ...incoming.draft, id: base.id };
  });

  const existing = records.find((r) => r.id === id);
  if (id && !existing) {
    return (
      <div className="screen">
        <div className="empty">
          <p className="muted">{ready ? 'That record is not in your collection.' : 'Loading…'}</p>
          <Link className="button" to="/">Back to shelf</Link>
        </div>
      </div>
    );
  }
  return <Form key={id ?? location.key} initial={existing ?? fresh} isNew={!id} photo={id ? undefined : incoming.photo} />;
}

const list = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Form({ initial, isNew, photo }: { initial: VinylRecord; isNew: boolean; photo?: NewRecordState['photo'] }) {
  const { records, repo, settings } = useApp();
  const navigate = useNavigate();
  const [record, setRecord] = useState(initial);
  const [price, setPrice] = useState(initial.purchase.price === null ? '' : String(initial.purchase.price));
  const [genres, setGenres] = useState(initial.genres.join(', '));
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [trackText, setTrackText] = useState(() => formatTracks(initial.tracklist));
  const [cover, setCover] = useState<CoverChange>(undefined);
  const [colors, setColors] = useState({ spineColor: initial.spineColor, popColor: initial.popColor });
  const { spineColor, popColor } = colors;
  const [coverStatus, setCoverStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const storedSrc = useCoverSrc(initial);
  const abort = useRef<AbortController | null>(null);
  const initialColors = useRecordColors(isNew ? undefined : initial);
  // Follows a newly chosen cover; otherwise the colours the record already had.
  useCoverTheme(spineColor && popColor ? { main: spineColor, pop: popColor } : (initialColors ?? undefined));

  const patch = (change: Partial<VinylRecord>) => setRecord((r) => ({ ...r, ...change }));
  const patchIn = <K extends 'format' | 'edition' | 'purchase' | 'condition'>(key: K, change: Partial<VinylRecord[K]>) =>
    setRecord((r) => ({ ...r, [key]: { ...r[key], ...change } }));

  const applyThumbnail = ({ dataUrl, spineColor, popColor }: Thumbnail) => {
    abort.current?.abort();
    setCover(dataUrl);
    setColors({ spineColor, popColor });
    setCoverStatus('');
  };

  const searchArtwork = () => {
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setCoverStatus('Looking for artwork…');
    findArtwork(
      { artist: record.artist, title: record.title, mbid: record.links.mbid, coverUrl: record.links.coverUrl },
      controller.signal,
    )
      .then((thumb) => {
        if (controller.signal.aborted) return;
        if (!thumb) return setCoverStatus('No artwork found that can be saved. You can add a photo instead.');
        setCover(thumb.dataUrl);
        setColors({ spineColor: thumb.spineColor, popColor: thumb.popColor });
        setCoverStatus('');
      })
      .catch(() => !controller.signal.aborted && setCoverStatus('Could not fetch artwork.'));
  };

  // A new record found online gets a saved copy of its artwork straight away.
  useEffect(() => {
    if (isNew && initial.title && initial.artist) searchArtwork();
    return () => abort.current?.abort();
    // Runs once for the record the form opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      applyThumbnail(await makeThumbnail(file));
    } catch (e) {
      setCoverStatus((e as Error).message);
    }
  };

  const owned = record.title && record.artist ? findOwned(records, record) : [];

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const value = price.trim() === '' ? null : Number(price.replace(',', '.'));
    if (!record.title.trim() || !record.artist.trim()) return setError('Enter at least the artist and the album title.');
    if (value !== null && (!Number.isFinite(value) || value < 0)) return setError('Enter the price as a number, such as 32.50.');
    abort.current?.abort();
    setSaving(true);
    setError('');
    const final: VinylRecord = {
      ...record,
      artist: record.artist.trim(),
      title: record.title.trim(),
      genres: list(genres),
      tags: list(tags),
      tracklist: parseTracks(trackText),
      purchase: { ...record.purchase, price: value },
      spineColor: cover === null ? '' : spineColor,
      popColor: cover === null ? '' : popColor,
    };
    try {
      await repo.saveRecord(final, cover);
      navigate(`/record/${final.id}`, { replace: true });
    } catch (e) {
      setError(`Could not save: ${(e as Error).message}`);
      setSaving(false);
    }
  };

  const preview = cover === undefined ? storedSrc : (cover ?? record.links.coverUrl);
  const currencies = [...new Set([record.purchase.currency, settings.currency, ...CURRENCIES])];

  return (
    <form className="screen form" onSubmit={save} noValidate>
      <header className="page-head">
        <h1>{isNew ? 'Add record' : 'Edit record'}</h1>
        <button type="button" className="button" onClick={() => navigate(-1)}>Cancel</button>
      </header>

      {owned.length > 0 && isNew && (
        <p className="notice" role="status">
          You may already own this: <Link to={`/record/${owned[0].id}`}>{owned[0].title} by {owned[0].artist}</Link>. Save to add another copy.
        </p>
      )}

      <section className="cover-editor">
        <CoverImage src={preview} title={record.title || 'No cover'} artist={record.artist} color={spineColor} />
        <div className="stack">
          <label className="button file">
            Use a photo
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {photo && cover !== photo.dataUrl && (
            <button type="button" className="button" onClick={() => applyThumbnail(photo)}>Use my scan photo</button>
          )}
          <button type="button" className="button" disabled={!record.title || !record.artist} onClick={searchArtwork}>
            Find artwork online
          </button>
          {(cover || (cover === undefined && record.coverVersion > 0)) && (
            <button type="button" className="button" onClick={() => { abort.current?.abort(); setCover(null); setColors({ spineColor: '', popColor: '' }); setCoverStatus(''); }}>
              Remove saved cover
            </button>
          )}
          <p className="muted small" role="status">{coverStatus}</p>
        </div>
      </section>

      <fieldset>
        <legend>Your purchase</legend>
        <Field label="Price paid">
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Currency">
          <select value={record.purchase.currency} onChange={(e) => patchIn('purchase', { currency: e.target.value })}>
            {currencies.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Date bought">
          <input type="date" value={record.purchase.date} onChange={(e) => patchIn('purchase', { date: e.target.value })} />
        </Field>
        <Field label="Store">
          <input value={record.purchase.store} onChange={(e) => patchIn('purchase', { store: e.target.value })} />
        </Field>
        <Field label="Media condition">
          <select value={record.condition.media} onChange={(e) => patchIn('condition', { media: e.target.value as Grade })}>
            {GRADES.map((g) => <option key={g} value={g}>{g || 'Not graded'}</option>)}
          </select>
        </Field>
        <Field label="Sleeve condition">
          <select value={record.condition.sleeve} onChange={(e) => patchIn('condition', { sleeve: e.target.value as Grade })}>
            {GRADES.map((g) => <option key={g} value={g}>{g || 'Not graded'}</option>)}
          </select>
        </Field>
      </fieldset>

      <fieldset>
        <legend>Album</legend>
        <Field label="Artist" wide><input required value={record.artist} onChange={(e) => patch({ artist: e.target.value })} /></Field>
        <Field label="Album title" wide><input required value={record.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Release year">
          <input inputMode="numeric" maxLength={4} value={record.year ?? ''} onChange={(e) => patch({ year: Number(e.target.value.replace(/\D/g, '')) || null })} />
        </Field>
        <Field label="Country"><input value={record.country} onChange={(e) => patch({ country: e.target.value })} /></Field>
        <Field label="Label"><input value={record.label} onChange={(e) => patch({ label: e.target.value })} /></Field>
        <Field label="Catalogue number"><input value={record.catalogNumber} onChange={(e) => patch({ catalogNumber: e.target.value })} /></Field>
        <Field label="Barcode" wide><input inputMode="numeric" value={record.barcode} onChange={(e) => patch({ barcode: e.target.value })} /></Field>
        <Field label="Genres (comma separated)" wide><input value={genres} onChange={(e) => setGenres(e.target.value)} /></Field>
      </fieldset>

      <fieldset>
        <legend>Edition and pressing</legend>
        <label className="check wide">
          <input type="checkbox" checked={record.edition.isSpecial} onChange={(e) => patchIn('edition', { isSpecial: e.target.checked })} />
          <span>Special edition</span>
        </label>
        <Field label="Edition name" wide><input value={record.edition.name} onChange={(e) => patchIn('edition', { name: e.target.value })} /></Field>
        <Field label="Vinyl colour"><input value={record.edition.color} placeholder="Black" onChange={(e) => patchIn('edition', { color: e.target.value })} /></Field>
        <Field label="Copy number"><input value={record.edition.numbering} placeholder="123/500" onChange={(e) => patchIn('edition', { numbering: e.target.value })} /></Field>
        <Field label="Edition notes" wide><input value={record.edition.notes} onChange={(e) => patchIn('edition', { notes: e.target.value })} /></Field>
        <Field label="Size">
          <select value={record.format.size} onChange={(e) => patchIn('format', { size: e.target.value })}>
            {[...new Set([record.format.size, '12"', '10"', '7"', ''])].map((s) => <option key={s} value={s}>{s || 'Unknown'}</option>)}
          </select>
        </Field>
        <Field label="Speed (rpm)">
          <select value={record.format.speed} onChange={(e) => patchIn('format', { speed: e.target.value })}>
            {[...new Set([record.format.speed, '33', '45', '78', ''])].map((s) => <option key={s} value={s}>{s || 'Unknown'}</option>)}
          </select>
        </Field>
        <Field label="Number of discs">
          <input type="number" min={1} max={99} value={record.format.discs} onChange={(e) => patchIn('format', { discs: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label="Pressing details" wide><input value={record.format.text} onChange={(e) => patchIn('format', { text: e.target.value })} /></Field>
      </fieldset>

      <fieldset>
        <legend>Tracklist and notes</legend>
        <Field label="One track per line: A1 | Title | 3:45" wide>
          <textarea rows={8} value={trackText} onChange={(e) => setTrackText(e.target.value)} spellCheck={false} />
        </Field>
        <Field label="Rating">
          <select value={record.rating} onChange={(e) => patch({ rating: Number(e.target.value) })}>
            <option value={0}>Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} out of 5</option>)}
          </select>
        </Field>
        <Field label="Tags (comma separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        <Field label="Notes" wide><textarea rows={3} value={record.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field>
      </fieldset>

      <div className="save-bar">
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="button primary wide" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Add to shelf' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
