import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadRelease } from '../../lookup/lookup';
import type { Candidate } from '../../lookup/types';
import type { NewRecordState } from '../../pages/EditRecord';
import { useApp } from '../../state/AppContext';
import { candidateKey } from './Candidates';

/** Loads the full release for a chosen result and opens the add form with it. */
export function usePicker(extra: { barcode?: string; photo?: NewRecordState['photo'] } = {}) {
  const { settings } = useApp();
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const pick = async (candidate: Candidate) => {
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setBusyKey(candidateKey(candidate));
    setError('');
    try {
      const draft = await loadRelease(candidate, settings.discogsToken, controller.signal);
      const state: NewRecordState = {
        draft: { ...draft, barcode: extra.barcode || draft.barcode || candidate.barcode },
        photo: extra.photo,
      };
      navigate('/new', { state });
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusyKey('');
    }
  };

  return { pick, busyKey, error };
}
