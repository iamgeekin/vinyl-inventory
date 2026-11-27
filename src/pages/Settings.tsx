import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppearancePicker } from '../components/AppearancePicker';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SyncSettings } from '../components/SyncSettings';
import { buildBackup, parseBackup, toCsv, type Backup } from '../data/backup';
import { sampleRecords } from '../data/sample';
import { CURRENCIES } from '../data/types';
import { useApp } from '../state/AppContext';

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function Settings() {
  const { records, repo, settings, saveSettings } = useApp();
  const [typed, setTyped] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<Backup | null>(null);
  const token = typed ?? settings.discogsToken;
  const today = new Date().toISOString().slice(0, 10);
  const samples = records.filter((r) => r.id.startsWith('sample-'));

  const run = async (label: string, task: () => Promise<string>) => {
    setStatus(label);
    try {
      setStatus(await task());
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  const exportJson = () =>
    run('Preparing the backup…', async () => {
      const covers: Record<string, string> = {};
      for (const r of records) {
        if (!r.coverVersion) continue;
        const cover = await repo.getCover(r.id, r.coverVersion);
        if (cover) covers[r.id] = cover;
      }
      download(`vinyl-backup-${today}.json`, 'application/json', JSON.stringify(buildBackup(records, covers)));
      return `Backup of ${records.length} records saved to your downloads.`;
    });

  const restore = (backup: Backup) => {
    setPending(null);
    run('Importing…', async () => {
      for (const record of backup.records) {
        const cover = backup.covers[record.id];
        await repo.saveRecord(cover ? record : { ...record, coverVersion: 0 }, cover);
      }
      return `Imported ${backup.records.length} records.`;
    });
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    run('Reading the file…', async () => {
      const backup = parseBackup(await file.text());
      setPending(backup);
      return '';
    });
  };

  const saveToken = (e: FormEvent) => {
    e.preventDefault();
    saveSettings({ discogsToken: token.trim() });
    setTyped(null);
    setStatus(token.trim() ? 'Discogs token saved.' : 'Discogs token removed.');
  };

  return (
    <div className="screen">
      <header className="page-head">
        <h1>Settings</h1>
        <Link className="button" to="/">Done</Link>
      </header>
      <div className="page-body">
        <p className="status" role="status">{status}</p>

        <SyncSettings />

        <section className="card">
          <h2>Appearance</h2>
          <AppearancePicker />
          <p className="muted small">The page takes its colours from the cover of the record in focus, in every mode.</p>
        </section>

        <section className="card">
          <h2>Currency</h2>
          <label className="field wide">
            <span>Default for new records</span>
            <select value={settings.currency} onChange={(e) => saveSettings({ currency: e.target.value })}>
              {[...new Set([settings.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </section>

        <section className="card">
          <h2>Discogs</h2>
          <p className="muted small">
            A personal token adds cover pictures to search results, allows more searches and lets you send records to your Discogs collection. Create one at{' '}
            <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noreferrer">discogs.com/settings/developers</a>.
            It stays on this device, is never synced, and is sent only to Discogs.
          </p>
          <form className="row grow" onSubmit={saveToken}>
            <input type="password" aria-label="Discogs personal access token" autoComplete="off" value={token} onChange={(e) => setTyped(e.target.value)} />
            <button type="submit" className="button" disabled={typed === null}>Save</button>
          </form>
          <Link className="button" to="/discogs">Send to Discogs</Link>
        </section>

        <section className="card">
          <h2>Backup</h2>
          <div className="row">
            <button type="button" className="button" disabled={!records.length} onClick={exportJson}>Export backup</button>
            <button type="button" className="button" disabled={!records.length} onClick={() => download(`vinyl-collection-${today}.csv`, 'text/csv', `﻿${toCsv(records)}`)}>
              Export spreadsheet (CSV)
            </button>
            <label className="button file">
              Import backup
              <input type="file" accept="application/json,.json" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
        </section>

        {repo.kind === 'local' && (
          <section className="card">
            <h2>Sample records</h2>
            <div className="row">
              <button
                type="button"
                className="button"
                onClick={() => run('Adding samples…', async () => {
                  for (const r of sampleRecords(settings.currency)) await repo.saveRecord(r, undefined);
                  return 'Sample records added.';
                })}
              >
                Add samples
              </button>
              <button
                type="button"
                className="button"
                disabled={!samples.length}
                onClick={() => run('Removing samples…', async () => {
                  for (const r of samples) await repo.deleteRecord(r.id);
                  return 'Sample records removed.';
                })}
              >
                Remove samples
              </button>
            </div>
          </section>
        )}
      </div>

      {pending && (
        <ConfirmDialog title="Import this backup?" confirmLabel="Import" onCancel={() => setPending(null)} onConfirm={() => restore(pending)}>
          It holds {pending.records.length} records.{' '}
          {(() => {
            const replaced = pending.records.filter((p) => records.some((r) => r.id === p.id)).length;
            return replaced ? `${replaced} of them will overwrite the versions on your shelf.` : 'None of your current records will be changed.';
          })()}
        </ConfirmDialog>
      )}
    </div>
  );
}
