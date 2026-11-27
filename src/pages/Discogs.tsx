import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DiscogsLink } from '../components/DiscogsLink';
import type { VinylRecord } from '../data/types';
import { discogsCollection } from '../discogs/collection';
import { planSync, sendMissing, type SendResult } from '../discogs/plan';
import type { Candidate } from '../lookup/types';
import { useApp } from '../state/AppContext';

interface Account {
  name: string;
  /** Copies of each release in the Discogs collection. */
  owned: Map<number, number>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const releaseUrl = (id: number) => `https://www.discogs.com/release/${id}`;
const PAUSED = 'Discogs asked the app to slow down. Continuing in a minute…';

export function Discogs() {
  const { records, ready, repo, settings, settingsReady } = useApp();
  const token = settings.discogsToken;
  const [account, setAccount] = useState<Account | null>(null);
  const [skipped, setSkipped] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState<'' | 'checking' | 'sending' | 'stopping'>('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<SendResult['failed']>([]);
  const [linking, setLinking] = useState('');
  const abort = useRef<AbortController | null>(null);
  // Leaving the screen stops the work after any request already sent.
  useEffect(() => () => abort.current?.abort(), []);

  const plan = useMemo(() => (account ? planSync(records, account.owned) : null), [records, account]);
  const chosen = plan?.toAdd.filter((item) => !skipped.has(item.releaseId)) ?? [];
  const copies = chosen.reduce((n, item) => n + item.copies, 0);
  const sending = busy === 'sending' || busy === 'stopping';

  const begin = (kind: 'checking' | 'sending') => {
    const controller = (abort.current = new AbortController());
    setBusy(kind);
    setError('');
    setFailed([]);
    return controller.signal;
  };

  const client = () => discogsCollection(token, { onPause: () => setStatus(PAUSED) });

  const check = async () => {
    const signal = begin('checking');
    setAccount(null);
    setStatus('Connecting to Discogs…');
    try {
      const discogs = client();
      const name = await discogs.username(signal);
      const owned = await discogs.ownedCopies(name, signal, (page, pages) =>
        setStatus(`Reading your Discogs collection, page ${page} of ${pages}…`),
      );
      setAccount({ name, owned });
      setStatus('');
    } catch (e) {
      if (signal.aborted) return;
      setStatus('');
      setError((e as Error).message);
    }
    setBusy('');
  };

  const send = async (name: string) => {
    const signal = begin('sending');
    const discogs = client();
    const total = copies;
    setStatus(`Adding 1 of ${total}…`);
    const result = await sendMissing(
      chosen,
      (releaseId) => discogs.add(name, releaseId, signal),
      signal,
      (releaseId, added) => {
        setAccount((current) => {
          if (!current) return current;
          const owned = new Map(current.owned);
          owned.set(releaseId, (owned.get(releaseId) ?? 0) + 1);
          return { ...current, owned };
        });
        if (added < total) setStatus(`Adding ${added + 1} of ${total}…`);
      },
    );
    const summary = `Added ${plural(result.added, 'release')} to your Discogs collection.`;
    setStatus(signal.aborted ? `Stopped. ${summary}` : summary);
    setError(result.problem);
    setFailed(result.failed);
    // After a problem the list may be out of date, so it has to be read again.
    if (result.problem) setAccount(null);
    setBusy('');
  };

  const stop = () => {
    setBusy('stopping');
    abort.current?.abort();
  };

  const toggle = (releaseId: number) => {
    const next = new Set(skipped);
    if (!next.delete(releaseId)) next.add(releaseId);
    setSkipped(next);
  };

  const link = async (record: VinylRecord, candidate: Candidate) => {
    setLinking('');
    setError('');
    try {
      await repo.saveRecord({ ...record, links: { ...record.links, discogsId: Number(candidate.id) } }, undefined);
      setStatus(`Linked “${record.title}” to Discogs.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <header className="page-head">
        <h1>Send to Discogs</h1>
        <Link className="button" to="/settings">Done</Link>
      </header>
      <div className="page-body">
        <section className="card">
          <p className="muted small">
            Adds records from this app to the Uncategorized folder of your Discogs collection. Nothing there is changed or
            removed. Only the release is sent: condition, price, notes and photos stay in the app.
          </p>
          {repo.kind === 'synced' && (
            <p className="muted small">This collection is synced. If you share it, untick records that are not yours.</p>
          )}
          {!settingsReady || token ? (
            <button type="button" className="button primary" disabled={!token || !ready || busy !== ''} onClick={check}>
              {account ? 'Check again' : 'Check my collection'}
            </button>
          ) : (
            <p>Add your Discogs token in <Link to="/settings">Settings</Link> first.</p>
          )}
        </section>

        <p className="status" role="status">{status}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {failed.length > 0 && (
          <ul className="stack">
            {failed.map(({ item, message }) => (
              <li key={item.releaseId} className="error small">
                Not added: <a href={releaseUrl(item.releaseId)} target="_blank" rel="noreferrer">{item.record.title}</a>. {message}
              </li>
            ))}
          </ul>
        )}

        {account && plan && (
          <section className="card">
            <h2>Ready to add</h2>
            <p className="muted small">
              Discogs account: <strong>{account.name}</strong>. {plural(plan.alreadyThere, 'record')} already there.
            </p>
            {plan.toAdd.length > 0 ? (
              <>
                <div className="row">
                  <button type="button" className="link" disabled={sending} onClick={() => setSkipped(new Set())}>Select all</button>
                  <button type="button" className="link" disabled={sending} onClick={() => setSkipped(new Set(plan.toAdd.map((i) => i.releaseId)))}>
                    Select none
                  </button>
                </div>
                <ul className="picks">
                  {plan.toAdd.map(({ releaseId, record, copies: count }) => (
                    <li key={releaseId}>
                      <label className="check">
                        <input type="checkbox" checked={!skipped.has(releaseId)} disabled={sending} onChange={() => toggle(releaseId)} />
                        <span>
                          <strong>{record.title}</strong>
                          <span className="muted small">
                            {[record.artist, record.year, record.country, record.catalogNumber, count > 1 && `${count} copies`]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                      </label>
                      <a className="small" href={releaseUrl(releaseId)} target="_blank" rel="noreferrer" aria-label={`View ${record.title} on Discogs`}>View</a>
                    </li>
                  ))}
                </ul>
                {sending ? (
                  <>
                    <button type="button" className="button wide" disabled={busy === 'stopping'} onClick={stop}>
                      {busy === 'stopping' ? 'Stopping…' : 'Stop'}
                    </button>
                    <p className="muted small">Keep this screen open until it finishes.</p>
                  </>
                ) : (
                  <button type="button" className="button primary wide" disabled={!copies || busy !== ''} onClick={() => send(account.name)}>
                    {copies ? `Add ${plural(copies, 'release')} to Discogs` : 'Nothing selected'}
                  </button>
                )}
              </>
            ) : (
              <p>Nothing to add. Every linked record is in your Discogs collection.</p>
            )}
          </section>
        )}

        {plan && plan.unlinked.length > 0 && (
          <section className="card">
            <h2>Not linked to Discogs</h2>
            <p className="muted small">
              {plural(plan.unlinked.length, 'record')} cannot be sent until you choose the matching Discogs release.
            </p>
            <ul className="picks">
              {plan.unlinked.map((record) => (
                <li key={record.id} className="unlinked">
                  <div className="pick-row">
                    <span>
                      <strong>{record.title}</strong>
                      <span className="muted small">
                        {[record.artist, record.year, record.catalogNumber].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="button"
                      aria-expanded={linking === record.id}
                      aria-label={`${linking === record.id ? 'Close search for' : 'Find on Discogs:'} ${record.title}`}
                      onClick={() => setLinking(linking === record.id ? '' : record.id)}
                    >
                      {linking === record.id ? 'Close' : 'Find'}
                    </button>
                  </div>
                  {linking === record.id && <DiscogsLink record={record} token={token} onPick={(c) => link(record, c)} />}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
