import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { cleanBarcode, hasValidCheckDigit } from '../../lookup/barcode';
import { lookupBarcode, type LookupResult } from '../../lookup/lookup';
import { useApp } from '../../state/AppContext';
import { Candidates } from './Candidates';
import { usePicker } from './usePicker';

const BarcodeScanner = lazy(() => import('../../scan/BarcodeScanner'));

// Kept so results are still there after going back from the form.
let remembered: { code: string; result: LookupResult | null } = { code: '', result: null };

export function BarcodeTab() {
  const { settings } = useApp();
  const [code, setCode] = useState(remembered.code);
  const [result, setResult] = useState(remembered.result);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);
  const { pick, busyKey, error } = usePicker({ barcode: result ? cleanBarcode(remembered.code) : '' });
  useEffect(() => () => abort.current?.abort(), []);

  const search = useCallback(
    async (value: string) => {
      const digits = cleanBarcode(value);
      setScanning(false);
      setCode(digits);
      if (digits.length < 8) return setMessage('A barcode has at least 8 digits.');
      abort.current?.abort();
      const controller = (abort.current = new AbortController());
      setBusy(true);
      setResult(null);
      setMessage(hasValidCheckDigit(digits) ? '' : 'Those digits do not check out. Compare them with the sleeve.');
      remembered = { code: digits, result: null };
      try {
        const found = await lookupBarcode(digits, settings.discogsToken, controller.signal);
        remembered = { code: digits, result: found };
        setResult(found);
      } catch (e) {
        if (!controller.signal.aborted) setMessage((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [settings.discogsToken],
  );

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setMessage('Reading the barcode…');
    try {
      const { detectBarcode } = await import('../../scan/detector');
      const found = await detectBarcode(file);
      if (found) await search(found);
      else setMessage('No barcode found in that photo. Try closer and flatter, or type the number.');
    } catch {
      setMessage('That photo could not be read.');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    search(code);
  };

  return (
    <div className="stack">
      {scanning ? (
        <Suspense fallback={<div className="viewfinder"><p>Loading the scanner…</p></div>}>
          <BarcodeScanner onFound={search} />
        </Suspense>
      ) : (
        <button type="button" className="button primary wide" onClick={() => { setMessage(''); setScanning(true); }}>
          Scan with camera
        </button>
      )}
      <div className="row">
        {scanning && <button type="button" className="button" onClick={() => setScanning(false)}>Stop camera</button>}
        <label className="button file">
          Use a photo of the barcode
          <input type="file" accept="image/*" onChange={(e) => { fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      <form className="row grow" onSubmit={submit}>
        <input
          aria-label="Barcode number"
          inputMode="numeric"
          placeholder="Or type the barcode number"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="button" disabled={busy}>Look up</button>
      </form>

      <p className="muted small" role="status">{busy ? 'Searching…' : message}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {result?.problems.map((p) => <p key={p} className="error small">{p}</p>)}

      {result && result.candidates.length > 0 && (
        <>
          <h2 className="section-label">
            {result.candidates.length === 1 ? 'Found 1 pressing' : `Found ${result.candidates.length} pressings. Which is yours?`}
          </h2>
          {!settings.discogsToken && (
            <p className="muted small">Add a free Discogs token in <Link to="/settings">Settings</Link> to see cover pictures here.</p>
          )}
          <Candidates candidates={result.candidates} onPick={pick} busyKey={busyKey} />
        </>
      )}
      {result && result.candidates.length === 0 && (
        <div className="stack">
          <p className="muted">No release found for this barcode. Try searching by name, or enter it yourself.</p>
          <Link className="button" to="/new" state={{ draft: { barcode: remembered.code } }}>Enter details manually</Link>
        </div>
      )}
    </div>
  );
}
