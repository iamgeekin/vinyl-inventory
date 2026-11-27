import { normalizeCode } from './code';

const KEY = 'vinyl.syncCode';

export function readCode(): string | null {
  try {
    return normalizeCode(localStorage.getItem(KEY) ?? '');
  } catch {
    return null;
  }
}

/** Throws when the browser will not keep it, because the code would be lost on reload. */
export function storeCode(code: string | null) {
  if (code) localStorage.setItem(KEY, code);
  else localStorage.removeItem(KEY);
}
