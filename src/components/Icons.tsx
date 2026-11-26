import type { ReactNode } from 'react';

const icon = (children: ReactNode) =>
  function Icon() {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    );
  };

export const ShelfIcon = icon(<path d="M4 4v13M8 4v13M12 6v11M15.5 5.5l4 11M3 20h18" />);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>);
export const AddIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>);
export const StatsIcon = icon(<path d="M5 20v-7M12 20V5M19 20v-10" />);
export const GearIcon = icon(
  <><path d="M4 7h9M18 7h2M4 17h2M11 17h9" /><circle cx="15.5" cy="7" r="2.5" /><circle cx="8.500" cy="17" r="2.5" /></>,
);
export const BackIcon = icon(<path d="M15 5l-7 7 7 7" />);
export const SunIcon = icon(
  <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M19 5l-1.500 1.500M6.500 17.500L5 19" /></>,
);
export const MoonIcon = icon(<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z" />);
export const NightIcon = icon(
  <><path d="M18 15.500A8 8 0 0 1 8.500 6a8 8 0 1 0 9.500 9.500z" fill="currentColor" /><path d="M17 3v5M14.500 5.500h5" /></>,
);
export const PreviousIcon = icon(<path d="M14 6l-6 6 6 6" />);
export const NextIcon = icon(<path d="M10 6l6 6-6 6" />);
