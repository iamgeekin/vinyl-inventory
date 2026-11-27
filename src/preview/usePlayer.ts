import { useCallback, useEffect, useRef, useState } from 'react';

export interface PlayerState {
  /** Which track the player holds, or null. */
  index: number | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'failed';
  /** 0 to 1 through the clip. */
  progress: number;
}

const IDLE: PlayerState = { index: null, status: 'idle', progress: 0 };

/** One clip at a time. Playback stops when the screen is left. */
export function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>(IDLE);
  const held = useRef<number | null>(null);

  const stop = useCallback(() => {
    audio.current?.pause();
    audio.current?.removeAttribute('src');
    held.current = null;
    setState(IDLE);
  }, []);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current?.removeAttribute('src');
      audio.current = null;
    },
    [],
  );

  const element = () => {
    if (audio.current) return audio.current;
    const player = new Audio();
    player.preload = 'none';
    player.addEventListener('playing', () => setState((s) => ({ ...s, status: 'playing' })));
    player.addEventListener('waiting', () => setState((s) => ({ ...s, status: 'loading' })));
    player.addEventListener('pause', () => setState((s) => (s.index === null ? s : { ...s, status: 'paused' })));
    player.addEventListener('timeupdate', () =>
      setState((s) => (s.index === null || !player.duration ? s : { ...s, progress: player.currentTime / player.duration })),
    );
    player.addEventListener('ended', () => {
      held.current = null;
      setState(IDLE);
    });
    player.addEventListener('error', () => {
      if (player.getAttribute('src')) setState((s) => ({ ...s, status: 'failed' }));
    });
    return (audio.current = player);
  };

  /** Call straight from a tap: phones refuse to start sound otherwise. */
  const toggle = (index: number, url: string) => {
    const player = element();
    if (held.current === index && !player.paused) {
      player.pause();
      return;
    }
    if (held.current !== index || player.error) {
      held.current = index;
      player.src = url;
      setState({ index, status: 'loading', progress: 0 });
    }
    player.play().catch((e: DOMException) => {
      if (held.current !== index || e.name === 'AbortError') return;
      // Refused because the tap was too long ago: another tap starts it.
      setState((s) => ({ ...s, status: e.name === 'NotAllowedError' ? 'paused' : 'failed' }));
    });
  };

  return { ...state, toggle, stop };
}
