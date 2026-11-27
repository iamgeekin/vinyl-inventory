import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon } from './Icons';

/**
 * Whether the element given the ref has scrolled out at the top of its screen.
 * `bar` is the height of whatever covers the top of the screen.
 */
function useScrolledAway(bar: number) {
  const [away, setAway] = useState(false);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting), {
        root: node.closest('.screen'),
        rootMargin: `-${bar}px 0px 0px 0px`,
      });
      observer.observe(node);
      return () => observer.disconnect();
    },
    [bar],
  );
  return [ref, away] as const;
}

interface LargeTitleProps {
  title: ReactNode;
  /** Buttons at the end of the title's row. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** The heading of a tab's first screen. It shrinks into a bar once scrolled away. */
export function LargeTitle({ title, actions, children }: LargeTitleProps) {
  const [ref, away] = useScrolledAway(44);
  return (
    <>
      <div className={`compact-bar${away ? ' is-shown' : ''}`} aria-hidden="true">
        <span>{title}</span>
      </div>
      <header className="large-head">
        <div className="large-row">
          <h1 ref={ref}>{title}</h1>
          {actions && <div className="head-actions">{actions}</div>}
        </div>
        {children}
      </header>
    </>
  );
}

interface NavBarProps {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}

/** The bar on a screen opened from another one. */
export function NavBar({ title, leading, trailing, children }: NavBarProps) {
  const [ref, scrolled] = useScrolledAway(0);
  return (
    <>
      <div className="nav-marker" ref={ref} />
      <header className={`navbar${scrolled ? ' is-scrolled' : ''}`}>
        <div className="navbar-row">
          <div>{leading}</div>
          <h1>{title}</h1>
          <div className="end">{trailing}</div>
        </div>
        {children}
      </header>
    </>
  );
}

/** Goes back a screen, or to `parent` when the app was opened on this one. */
export function BackButton({ parent }: { parent: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="round-button"
      aria-label="Back"
      onClick={() => (history.state?.idx > 0 ? navigate(-1) : navigate(parent, { replace: true }))}
    >
      <BackIcon />
    </button>
  );
}
