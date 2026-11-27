import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AddFillIcon, AddIcon, SearchBoldIcon, SearchIcon, ShelfFillIcon, ShelfIcon, StatsFillIcon, StatsIcon } from './Icons';

const TABS = [
  { to: '/', label: 'Shelf', Icon: ShelfIcon, SelectedIcon: ShelfFillIcon },
  { to: '/add', label: 'Add', Icon: AddIcon, SelectedIcon: AddFillIcon },
  { to: '/stats', label: 'Stats', Icon: StatsIcon, SelectedIcon: StatsFillIcon },
];
const SEARCH = { to: '/search', label: 'Search', Icon: SearchIcon, SelectedIcon: SearchBoldIcon };

/** Screens opened from the shelf, so its tab stays selected on them. */
const UNDER_SHELF = ['/settings', '/discogs'];

// What each tab was last showing, such as a search, to return to.
const lastShown: Record<string, string> = {};

/** The floating iPhone tab bar, with search set apart at its end. */
export function TabBar() {
  const { pathname, search } = useLocation();
  const selected = UNDER_SHELF.includes(pathname) ? '/' : pathname;
  lastShown[pathname] = search;

  const tab = ({ to, label, Icon, SelectedIcon }: (typeof TABS)[number]) => {
    const on = selected === to;
    return (
      <Link
        key={to}
        to={{ pathname: to, search: pathname === to ? search : lastShown[to] }}
        className="tab"
        aria-current={on ? 'page' : undefined}
        draggable={false}
        onClick={(e: MouseEvent) => {
          if (pathname !== to) return;
          // Tapping the tab you are on returns to the top.
          e.preventDefault();
          document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' });
          if (to === SEARCH.to) document.getElementById('q')?.focus({ preventScroll: true });
        }}
      >
        {on ? <SelectedIcon /> : <Icon />}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tab-group glass">{TABS.map(tab)}</div>
      <div className="tab-search glass">{tab(SEARCH)}</div>
    </nav>
  );
}
