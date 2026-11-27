import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { renderSVG } from 'uqr';
import { useApp } from '../state/AppContext';
import { formatCode } from '../sync/code';
import { ConfirmDialog } from './ConfirmDialog';
import { Switch } from './Switch';

const CodeScanner = lazy(() => import('../scan/CodeScanner'));

const plural = (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`;

export function SyncSettings() {
  const { sync } = useApp();
  return (
    <section className="card">
      <h2>Sync</h2>
      {!sync.available ? (
        <p>Records are saved on this device only. Export a backup regularly, or set up Firebase (see the project README) to sync between devices.</p>
      ) : sync.code ? (
        <Linked code={sync.code} />
      ) : (
        <Unlinked />
      )}
      <p className="sync-message" role="status">{sync.message}</p>
    </section>
  );
}

function Linked({ code }: { code: string }) {
  const { sync, ready } = useApp();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState('');
  const [confirming, setConfirming] = useState(false);
  // A data address keeps the drawing out of the page markup.
  const qr = useMemo(() => `data:image/svg+xml,${encodeURIComponent(renderSVG(code, { border: 3 }))}`, [code]);

  const copy = () =>
    navigator.clipboard.writeText(formatCode(code)).then(
      () => setCopied('Copied.'),
      () => setCopied('Could not copy. Select the code and copy it yourself.'),
    );

  return (
    <>
      <p>This device is synced. Records are encrypted with your sync code before they leave it.</p>
      <p className="muted small">
        Anyone with the code can see, change and delete this collection. There is no way to recover a lost code, so keep it somewhere safe.
      </p>
      {shown ? (
        <div className="sync-code">
          <img src={qr} alt="Sync code as a QR code" width="220" height="220" />
          <p className="sync-code-text">{formatCode(code)}</p>
          <div className="row centre">
            <button type="button" className="button" onClick={copy}>Copy code</button>
            <button type="button" className="button" onClick={() => { setShown(false); setCopied(''); }}>Hide</button>
          </div>
          <p className="muted small" role="status">{copied}</p>
          <p className="muted small">On the other device, open Settings, then scan this or paste the code.</p>
        </div>
      ) : (
        <button type="button" className="button primary" onClick={() => setShown(true)}>Show sync code</button>
      )}
      {sync.deviceRecords > 0 && (
        <div className="stack">
          <p>{plural(sync.deviceRecords)} on this device {sync.deviceRecords === 1 ? 'is' : 'are'} not in the synced collection.</p>
          <button type="button" className="button" disabled={sync.busy} onClick={sync.moveDeviceRecords}>
            Add to the synced collection
          </button>
        </div>
      )}
      <button type="button" className="button" disabled={sync.busy || !ready} onClick={() => setConfirming(true)}>
        Stop syncing on this device
      </button>
      {confirming && (
        <ConfirmDialog
          title="Stop syncing here?"
          confirmLabel="Stop syncing"
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); sync.stop(); }}
        >
          This device keeps a copy of the records, and other devices carry on syncing. To link it again you will need the sync code, so save it first.
        </ConfirmDialog>
      )}
    </>
  );
}

function Unlinked() {
  const { sync } = useApp();
  const [mode, setMode] = useState<'join' | 'start'>('join');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [bring, setBring] = useState(true);
  const [scanning, setScanning] = useState(false);

  const join = (e: FormEvent) => {
    e.preventDefault();
    sync.join(code, bring && sync.deviceRecords > 0);
  };
  const start = (e: FormEvent) => {
    e.preventDefault();
    sync.start(invite);
  };

  return (
    <>
      <p>Sync between your devices, or share one collection, with a sync code. No account is needed.</p>
      <div className="segmented full" role="group" aria-label="How to sync">
        <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')}>I have a code</button>
        <button type="button" aria-pressed={mode === 'start'} onClick={() => { setMode('start'); setScanning(false); }}>New collection</button>
      </div>

      {mode === 'join' ? (
        <form className="stack" onSubmit={join}>
          {scanning ? (
            <>
              <Suspense fallback={<p className="muted">Loading the scanner…</p>}>
                <CodeScanner onFound={(found) => { setCode(formatCode(found)); setScanning(false); }} />
              </Suspense>
              <button type="button" className="button" onClick={() => setScanning(false)}>Stop camera</button>
            </>
          ) : (
            <button type="button" className="button" onClick={() => setScanning(true)}>Scan QR code</button>
          )}
          <label className="field wide">
            <span>Sync code</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          </label>
          {sync.deviceRecords > 0 && (
            <label className="check">
              <span>Also add the {plural(sync.deviceRecords)} on this device</span>
              <Switch checked={bring} onChange={(e) => setBring(e.target.checked)} />
            </label>
          )}
          <button type="submit" className="button primary" disabled={sync.busy || !code.trim()}>Link this device</button>
        </form>
      ) : (
        <form className="stack" onSubmit={start}>
          <label className="field wide">
            <span>Invite phrase</span>
            <input type="password" value={invite} onChange={(e) => setInvite(e.target.value)} autoComplete="off" />
          </label>
          <p className="muted small">
            Ask whoever set up syncing for the phrase. A new collection gets its own code.
            {sync.deviceRecords > 0 && ` The ${plural(sync.deviceRecords)} on this device will move into it.`}
          </p>
          <button type="submit" className="button primary" disabled={sync.busy || !invite.trim()}>Create sync code</button>
        </form>
      )}
    </>
  );
}
