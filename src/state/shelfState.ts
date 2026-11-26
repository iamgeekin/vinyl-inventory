import type { Filter } from '../data/sort';

export interface ShelfState {
  filter: Filter;
  /** The record in focus, shared by the spine shelf, the slider and the record page. */
  selected: string;
}

export const NO_FILTER: Filter = { genre: '', specialOnly: false };

// Kept outside React so the shelf looks the same after visiting another screen.
let state: ShelfState = { filter: NO_FILTER, selected: '' };

export const readShelfState = () => state;

export function writeShelfState(patch: Partial<ShelfState>): ShelfState {
  state = { ...state, ...patch };
  return state;
}
