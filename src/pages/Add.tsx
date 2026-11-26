import { Link, useSearchParams } from 'react-router-dom';
import { BarcodeTab } from '../components/add/BarcodeTab';
import { PhotoTab } from '../components/add/PhotoTab';
import { TypeTab } from '../components/add/TypeTab';

const MODES = [
  { key: 'barcode', label: 'Barcode', Panel: BarcodeTab },
  { key: 'photo', label: 'Cover photo', Panel: PhotoTab },
  { key: 'type', label: 'Type', Panel: TypeTab },
];

export function Add() {
  const [params, setParams] = useSearchParams();
  const mode = MODES.find((m) => m.key === params.get('mode')) ?? MODES[0];

  return (
    <div className="screen">
      <header className="page-head stack">
        <h1>Add a record</h1>
        <div className="segmented full" role="group" aria-label="How to find it">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={m === mode} onClick={() => setParams({ mode: m.key }, { replace: true })}>
              {m.label}
            </button>
          ))}
        </div>
      </header>
      <div className="page-body">
        <mode.Panel />
        <p className="manual"><Link to="/new">Or enter every detail yourself</Link></p>
      </div>
    </div>
  );
}
