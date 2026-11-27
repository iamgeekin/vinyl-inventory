import { sortRecords } from '../data/sort';
import type { VinylRecord } from '../data/types';
import { LookupError } from '../lookup/http';
import { isSample } from '../sync/move';

export interface Missing {
  releaseId: number;
  /** One of the app's records of this release, for showing. */
  record: VinylRecord;
  /** How many more copies the app has than Discogs. */
  copies: number;
}

export interface Plan {
  toAdd: Missing[];
  /** Records Discogs already has. */
  alreadyThere: number;
  /** Records that do not say which Discogs release they are. */
  unlinked: VinylRecord[];
}

/** Compares the app's records with the number of copies of each release on Discogs. */
export function planSync(records: VinylRecord[], owned: ReadonlyMap<number, number>): Plan {
  const releases = new Map<number, VinylRecord[]>();
  const unlinked: VinylRecord[] = [];
  for (const record of sortRecords(records.filter((r) => !isSample(r)), 'artist')) {
    const id = record.links.discogsId;
    if (!id) unlinked.push(record);
    else releases.set(id, [...(releases.get(id) ?? []), record]);
  }
  const toAdd: Missing[] = [];
  let alreadyThere = 0;
  for (const [releaseId, mine] of releases) {
    const there = Math.min(owned.get(releaseId) ?? 0, mine.length);
    alreadyThere += there;
    if (mine.length > there) toAdd.push({ releaseId, record: mine[0], copies: mine.length - there });
  }
  return { toAdd, alreadyThere, unlinked };
}

export interface SendResult {
  added: number;
  failed: { item: Missing; message: string }[];
  /** Why sending ended early. Empty if it ran to the end or the user stopped it. */
  problem: string;
}

/** Refusals that concern one release only, so the rest can still be sent. */
const ONE_RELEASE = [400, 404, 422];

/**
 * Adds the missing copies one at a time. It never repeats a request that may have
 * got through, because that would leave a second copy on Discogs.
 */
export async function sendMissing(
  items: Missing[],
  add: (releaseId: number) => Promise<void>,
  signal: AbortSignal,
  onAdded: (releaseId: number, added: number) => void,
): Promise<SendResult> {
  const result: SendResult = { added: 0, failed: [], problem: '' };
  for (const item of items) {
    for (let copy = 0; copy < item.copies; copy++) {
      if (signal.aborted) return result;
      try {
        await add(item.releaseId);
      } catch (e) {
        if (signal.aborted && e === signal.reason) return result;
        const status = e instanceof LookupError ? e.status : 0;
        const message = (e as Error).message;
        if (ONE_RELEASE.includes(status)) {
          result.failed.push({ item, message });
          break;
        }
        const unsure = status === 0 || status >= 500;
        result.problem = unsure
          ? `${message} The last release may or may not have been added. Check your collection again before sending more.`
          : message;
        return result;
      }
      result.added += 1;
      onAdded(item.releaseId, result.added);
    }
  }
  return result;
}
