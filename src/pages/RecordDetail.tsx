import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { discColor, grooves } from '../components/colors';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Cover } from '../components/Cover';
import { BackButton } from '../components/NavBar';
import { Tracklist } from '../components/Tracklist';
import { formatDate, formatMoney } from '../data/stats';
import { useOriginalYear } from '../lookup/useOriginalYear';
import { useApp } from '../state/AppContext';
import { writeShelfState } from '../state/shelfState';
import { useCoverTheme } from '../theme/ThemeContext';
import { PHONE_LANDSCAPE, useMediaQuery } from '../theme/useMediaQuery';
import { useRecordColors } from '../theme/useRecordColors';

export function RecordDetail() {
  const { id } = useParams();
  const { records, ready, repo, settings, settingsReady } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const sideways = useMediaQuery(PHONE_LANDSCAPE);
  const record = records.find((r) => r.id === id);
  useCoverTheme(useRecordColors(record));
  const originalYear = useOriginalYear(record, settings.discogsToken, settingsReady);
  // The shelf comes back showing the record that was just viewed.
  useEffect(() => {
    if (record) writeShelfState({ selected: record.id });
  }, [record]);

  if (!record) {
    return (
      <div className="screen">
        <div className="empty">
          <p className="muted">{ready ? 'That record is not in your collection.' : 'Loading…'}</p>
          <Link className="button" to="/">Back to shelf</Link>
        </div>
      </div>
    );
  }

  const { edition, purchase, condition, format } = record;
  const editionLine = [edition.name, edition.color, edition.numbering].filter(Boolean).join(' · ');
  const disc = discColor(edition.color);
  const details: [string, string][] = [
    ['Label', [record.label, record.catalogNumber].filter(Boolean).join(' · ')],
    ['Store', purchase.store],
    ['Format', [format.size, format.speed && `${format.speed} rpm`, format.discs > 1 && `${format.discs} discs`].filter(Boolean).join(', ')],
    ['Pressing', format.text],
    ['Country', record.country],
    ['Barcode', record.barcode],
    ['Genre', [...record.genres, ...record.styles].join(', ')],
    ['Tags', record.tags.join(', ')],
    ['Rating', record.rating ? `${record.rating} out of 5` : ''],
    ['Edition notes', edition.notes],
  ];
  const grades = [condition.media, condition.sleeve];

  const remove = () => {
    setConfirming(false);
    repo.deleteRecord(record.id).then(() => navigate('/', { replace: true }));
  };

  const bar = (
    <div className="hero-bar">
      <BackButton parent="/" />
      <Link className="button" to={`/record/${record.id}/edit`}>Edit</Link>
    </div>
  );
  const art = (
    <>
      <div className="disc" style={{ background: grooves(disc) }} aria-hidden="true" />
      <Cover record={record} />
    </>
  );
  const heading = (
    <>
      <div className="title-block">
        <h1>{record.title}</h1>
        <p className="muted">{[record.artist, record.year, format.size && `${format.size}`].filter(Boolean).join(' · ')}</p>
        {originalYear && <p className="muted small">Originally released {originalYear}</p>}
      </div>

      {(edition.isSpecial || editionLine) && (
        <p className="edition">
          <span className="swatch" style={{ background: disc }} aria-hidden="true" />
          {editionLine || 'Special edition'}
        </p>
      )}
    </>
  );
  const body = (
    <>
      <dl className="tiles">
        <div><dt>Paid</dt><dd>{formatMoney(purchase.price, purchase.currency)}</dd></div>
        <div><dt>Bought</dt><dd>{formatDate(purchase.date)}</dd></div>
        <div><dt>Media / sleeve</dt><dd>{grades.some(Boolean) ? grades.map((g) => g || '—').join(' / ') : '—'}</dd></div>
      </dl>

      {record.tracklist.length > 0 ? (
        // A new key for each record stops one record's clip carrying over to the next.
        <Tracklist key={record.id} record={record} />
      ) : (
        <p className="muted">No tracklist yet. Use Edit to add one.</p>
      )}

      {record.notes && (
        <section className="side">
          <h2>Notes</h2>
          <p className="notes">{record.notes}</p>
        </section>
      )}

      <section className="side">
        <h2>Details</h2>
        <dl className="details">
          {details.filter(([, value]) => value).map(([key, value]) => (
            <div key={key}><dt className="muted">{key}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        {record.links.discogsId && (
          <p><a href={`https://www.discogs.com/release/${record.links.discogsId}`} target="_blank" rel="noreferrer">View this pressing on Discogs</a></p>
        )}
      </section>

      <button type="button" className="button danger wide" onClick={() => setConfirming(true)}>Delete record</button>
    </>
  );

  return (
    <div className={sideways ? 'screen detail sideways' : 'screen detail'}>
      {sideways ? (
        // A phone held sideways has little height, so the record stays on the left and the rest scrolls beside it.
        <>
          <aside className="detail-side">
            {bar}
            <div className="hero">{art}</div>
            <div className="detail-heading">{heading}</div>
          </aside>
          <div className="detail-body">{body}</div>
        </>
      ) : (
        <>
          <div className="hero">
            {art}
            {bar}
          </div>
          <div className="detail-body">
            {heading}
            {body}
          </div>
        </>
      )}

      {confirming && (
        <ConfirmDialog title="Delete this record?" confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirming(false)}>
          “{record.title}” by {record.artist} will be permanently removed from your collection.
        </ConfirmDialog>
      )}
    </div>
  );
}
