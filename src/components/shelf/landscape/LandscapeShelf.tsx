import type { LandscapeLayout } from '../../../data/types';
import { CrateDig } from './CrateDig';
import type { LandscapeProps } from './parts';
import { PullOutShelf } from './PullOutShelf';

/** The shelf on a phone held sideways, in the layout chosen in Settings. */
export function LandscapeShelf({ layout, ...props }: LandscapeProps & { layout: LandscapeLayout }) {
  // Anything unrecognised, saved perhaps by a later version, gets the default.
  return layout === 'crate' ? <CrateDig {...props} /> : <PullOutShelf {...props} />;
}
