import { Link } from 'react-router-dom';
import { LargeTitle } from '../components/NavBar';
import { formatMoney, spendByCurrency, topArtists } from '../data/stats';
import { useApp } from '../state/AppContext';

export function Stats() {
  const { records } = useApp();
  const totals = spendByCurrency(records);
  const special = records.filter((r) => r.edition.isSpecial).length;
  const discs = records.reduce((n, r) => n + r.format.discs, 0);
  const unpriced = records.filter((r) => r.purchase.price === null).length;

  return (
    <div className="screen">
      <LargeTitle title="Stats" />
      <div className="page-body">
        {records.length === 0 ? (
          <div className="empty">
            <p className="muted">Add a record to see your totals.</p>
            <Link className="button primary" to="/add">Add a record</Link>
          </div>
        ) : (
          <>
            <dl className="tiles">
              <div><dt>Records</dt><dd>{records.length}</dd></div>
              <div><dt>Discs</dt><dd>{discs}</dd></div>
              <div><dt>Special editions</dt><dd>{special}</dd></div>
            </dl>

            {totals.map((t) => {
              const max = Math.max(...t.byYear.map((y) => y.total), 0);
              return (
                <section className="card" key={t.currency}>
                  <h2>Spent in {t.currency}</h2>
                  <p className="hero-number">{formatMoney(t.total, t.currency)}</p>
                  <p className="muted small">
                    {t.count} priced {t.count === 1 ? 'record' : 'records'}, {formatMoney(t.average, t.currency)} on average
                  </p>
                  <table className="bars">
                    <caption>By purchase year</caption>
                    <thead className="sr-only">
                      <tr><th scope="col">Year</th><th scope="col">Share of the largest year</th><th scope="col">Spent</th></tr>
                    </thead>
                    <tbody>
                      {t.byYear.map((y) => (
                        <tr key={y.year} title={`${y.year}: ${formatMoney(y.total, t.currency)} on ${y.count} ${y.count === 1 ? 'record' : 'records'}`}>
                          <th scope="row">{y.year}</th>
                          <td className="bar-cell" aria-hidden="true">
                            <span className="bar" style={{ width: max ? `${(y.total / max) * 100}%` : 0 }} />
                          </td>
                          <td className="bar-value">{formatMoney(y.total, t.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}

            {unpriced > 0 && <p className="muted small">{unpriced} {unpriced === 1 ? 'record has' : 'records have'} no price and are not counted in spending.</p>}
            {totals.length > 1 && <p className="muted small">Currencies are shown separately and are not converted.</p>}

            <section className="card">
              <h2>Most collected artists</h2>
              <ol className="rank">
                {topArtists(records).map((a) => (
                  <li key={a.artist}>
                    <Link to={`/search?q=${encodeURIComponent(a.artist)}`}>
                      <span>{a.artist}</span>
                      <span className="muted">{a.count}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
