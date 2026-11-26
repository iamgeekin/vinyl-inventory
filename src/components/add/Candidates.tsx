import { SOURCE_NAMES, type Candidate } from '../../lookup/types';
import { CoverImage } from '../Cover';

interface Props {
  candidates: Candidate[];
  onPick: (candidate: Candidate) => void;
  busyKey?: string;
}

export const candidateKey = (c: Candidate) => `${c.source}:${c.id}`;

export function Candidates({ candidates, onPick, busyKey }: Props) {
  return (
    <ul className="candidates">
      {candidates.map((c) => (
        <li key={candidateKey(c)}>
          <button type="button" className="result" disabled={Boolean(busyKey)} onClick={() => onPick(c)}>
            <span className="result-main">
              <CoverImage src={c.thumbUrl} title={c.title} artist={c.artist} alt="" />
              <span>
                <span className="result-title">{c.title}</span>
                <span className="muted small">{c.artist}</span>
                {c.formatText && <span className="accent small">{c.formatText}</span>}
                <span className="muted small">
                  {[c.year, c.country, c.label, c.catalogNumber].filter(Boolean).join(' · ')}
                </span>
                <span className="muted small">
                  {busyKey === candidateKey(c) ? 'Loading details…' : `From ${SOURCE_NAMES[c.source]}${c.isVinyl ? '' : ' · may not be the vinyl pressing'}`}
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
