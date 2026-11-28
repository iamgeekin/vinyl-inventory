import type { ReactNode } from 'react';
import { SOURCE_NAMES, type Candidate } from '../../lookup/types';
import { CoverImage } from '../Cover';

interface Props {
  candidates: Candidate[];
  onPick: (candidate: Candidate) => void;
  busyKey?: string;
  /** A remark about a result, such as that it is already owned. */
  note?: (candidate: Candidate) => string;
  /** A separate button at the end of each result. */
  action?: (candidate: Candidate) => ReactNode;
}

export const candidateKey = (c: Candidate) => `${c.source}:${c.id}`;

export function Candidates({ candidates, onPick, busyKey, note, action }: Props) {
  return (
    <ul className="candidates">
      {candidates.map((c) => (
        <li key={candidateKey(c)} className={action ? 'with-action' : undefined}>
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
                {note?.(c) && <span className="accent small">{note(c)}</span>}
              </span>
            </span>
          </button>
          {action?.(c)}
        </li>
      ))}
    </ul>
  );
}
