import { NavLink } from 'react-router-dom';
import { AddIcon, SearchIcon, ShelfIcon, StatsIcon } from './Icons';

const TABS = [
  { to: '/', label: 'Shelf', Icon: ShelfIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/add', label: 'Add', Icon: AddIcon },
  { to: '/stats', label: 'Stats', Icon: StatsIcon },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
