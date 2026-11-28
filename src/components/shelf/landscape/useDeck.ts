import {
  useCallback, useEffect, useRef, useState,
  type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type WheelEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { VinylRecord } from '../../../data/types';
import { lockAxis } from '../../../gestures/math';
import { clampIndex, clampPosition, releaseTarget } from './layout';

/**
 * The place in the collection on a sideways layout. The record nearest to it is
 * the one in focus, which is shared with the rest of the app through `onSelect`.
 */
export function useDeck(records: VinylRecord[], selectedId: string, onSelect: (id: string) => void) {
  const navigate = useNavigate();
  const index = Math.max(0, records.findIndex((r) => r.id === selectedId));
  const [moved, setMoved] = useState(index);
  // A new sort order, filter or choice made elsewhere goes straight to the record.
  const aligned = records[clampIndex(Math.round(moved), records.length)]?.id === selectedId;
  const position = aligned ? moved : index;
  if (!aligned && moved !== index) setMoved(index);

  // What the gestures and animation read, which run between renders.
  const live = useRef({ records, selectedId, position, onSelect });
  live.current = { records, selectedId, position, onSelect };

  const frame = useRef(0);
  const stop = useCallback(() => cancelAnimationFrame(frame.current), []);
  useEffect(() => stop, [stop]);

  const move = useCallback((to: number) => {
    const now = live.current;
    const next = clampPosition(to, now.records.length);
    now.position = next;
    setMoved(next);
    const { id } = now.records[clampIndex(Math.round(next), now.records.length)];
    if (id !== now.selectedId) {
      now.selectedId = id;
      now.onSelect(id);
    }
  }, []);

  /** Eases to a record. `ease` is in milliseconds; longer is gentler. */
  const go = useCallback(
    (to: number, ease = 110) => {
      stop();
      const target = clampIndex(Math.round(to), live.current.records.length);
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return move(target);
      let last = performance.now();
      const step = (now: number) => {
        const elapsed = Math.min(48, Math.max(1, now - last));
        last = now;
        const from = live.current.position;
        const next = from + (target - from) * (1 - Math.exp(-elapsed / ease));
        if (Math.abs(target - next) < 0.004) return move(target);
        move(next);
        frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [move, stop],
  );

  const open = () => navigate(`/record/${live.current.records[clampIndex(Math.round(live.current.position), live.current.records.length)].id}`);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const { records: all, position: at } = live.current;
    const here = Math.round(at);
    if (e.key === 'Enter' && e.target === e.currentTarget) return open();
    const to = { ArrowLeft: here - 1, ArrowUp: here - 1, ArrowRight: here + 1, ArrowDown: here + 1, Home: 0, End: all.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    // The button that had focus may be about to leave the screen.
    if (e.target !== e.currentTarget) e.currentTarget.focus();
    go(to);
  };

  return { records, index, position, live, move, go, stop, open, onKeyDown };
}

export type Deck = ReturnType<typeof useDeck>;

interface DragOptions {
  axis: 'x' | 'y';
  /** 1 when dragging towards the right or down moves forward, -1 for the other way. */
  forward: 1 | -1;
  /** How far a finger travels for one record. */
  perItem: number;
}

/**
 * Handlers that move through the collection by dragging, with momentum. The
 * element and everything in it needs `touch-action: none`.
 */
export function useDeckDrag({ live, move, go, stop }: Deck, { axis, forward, perItem }: DragOptions) {
  const drag = useRef<{ x: number; y: number; from: number; last: number; at: number; speed: number; moving: boolean } | null>(null);
  const dragged = useRef(false);
  const wheel = useRef({ timer: 0, position: null as number | null });
  useEffect(() => () => clearTimeout(wheel.current.timer), []);

  const settle = () => go(Math.round(live.current.position));
  const abandon = () => {
    if (!drag.current) return;
    drag.current = null;
    settle();
  };

  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      dragged.current = false;
      if (!e.isPrimary || e.button !== 0) return;
      stop();
      const along = axis === 'x' ? e.clientX : e.clientY;
      drag.current = { x: e.clientX, y: e.clientY, from: live.current.position, last: along, at: e.timeStamp, speed: 0, moving: false };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current) return;
      if (e.pointerType === 'mouse' && !e.buttons) return abandon();
      const along = axis === 'x' ? e.clientX : e.clientY;
      if (!current.moving) {
        const locked = lockAxis(e.clientX - current.x, e.clientY - current.y);
        if (!locked) return;
        // A swipe the other way is neither a tap nor a move.
        dragged.current = true;
        if (locked !== axis) return abandon();
        current.moving = true;
        // Captured only once it is a drag, so that a plain tap still reaches what is inside.
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      const elapsed = e.timeStamp - current.at;
      if (elapsed > 0) current.speed = 0.7 * (((along - current.last) * forward) / perItem / elapsed) + 0.3 * current.speed;
      current.last = along;
      current.at = e.timeStamp;
      const start = axis === 'x' ? current.x : current.y;
      move(current.from + ((along - start) * forward) / perItem);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      if (!current.moving) return settle();
      const { position, records } = live.current;
      const target = releaseTarget(position, current.speed, e.timeStamp - current.at, records.length);
      go(target, 90 + Math.min(220, Math.abs(target - position) * 30));
    },
    onPointerCancel: abandon,
    onClickCapture(e: MouseEvent) {
      // The click that ends a drag must not open or select anything.
      if (dragged.current && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
      }
      dragged.current = false;
    },
    // A mouse wheel or trackpad, for a short window on a computer.
    onWheel(e: WheelEvent) {
      stop();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const state = wheel.current;
      state.position = clampIndex((state.position ?? live.current.position) + delta / 90, live.current.records.length);
      move(state.position);
      clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        state.position = null;
        settle();
      }, 140);
    },
    onDragStart: (e: DragEvent) => e.preventDefault(),
  };
}

/**
 * Handlers for a bar that jumps straight to a place: `toPosition` reads it from
 * the pointer. `scrubbing` is true while a finger is on the bar.
 */
export function useScrub(deck: Deck, toPosition: (e: PointerEvent<HTMLElement>) => number) {
  const [scrubbing, setScrubbing] = useState(false);
  const active = useRef(false);
  const follow = (e: PointerEvent<HTMLElement>) => {
    deck.stop();
    deck.move(clampIndex(toPosition(e), deck.live.current.records.length));
  };
  const end = () => {
    if (!active.current) return;
    active.current = false;
    setScrubbing(false);
    deck.go(Math.round(deck.live.current.position));
  };
  return {
    scrubbing,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (!e.isPrimary || e.button !== 0) return;
        active.current = true;
        setScrubbing(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        follow(e);
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        if (active.current) follow(e);
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
