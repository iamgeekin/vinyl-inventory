import type { ReactNode } from 'react';

/** Drawn to sit with iPhone symbols: rounded, even strokes, solid when selected. */
const icon = (children: ReactNode, strokeWidth = 1.8) =>
  function Icon() {
    return (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    );
  };

const books = (
  <>
    <rect x="3.5" y="4" width="4" height="16" rx="1.2" />
    <rect x="9.5" y="4" width="4" height="16" rx="1.2" />
    <path d="M15.4 6.3l3-.8a.9.9 0 0 1 1.1.6l3 12.1a.9.9 0 0 1-.7 1.1l-2.5.6a.9.9 0 0 1-1.1-.6l-3.2-12a.9.9 0 0 1 .4-1z" />
  </>
);
const bars = (
  <>
    <rect x="3.5" y="12" width="4.2" height="8" rx="1.1" />
    <rect x="9.9" y="4" width="4.2" height="16" rx="1.1" />
    <rect x="16.3" y="9" width="4.2" height="11" rx="1.1" />
  </>
);
const glass = <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></>;

export const ShelfIcon = icon(books);
export const ShelfFillIcon = icon(<g fill="currentColor">{books}</g>);
export const AddIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>);
export const AddFillIcon = icon(
  <path
    d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6zM11 7.5a1 1 0 0 1 2 0V11h3.500a1 1 0 0 1 0 2H13v3.500a1 1 0 0 1-2 0V13H7.500a1 1 0 0 1 0-2H11z"
    fill="currentColor"
    fillRule="evenodd"
    stroke="none"
  />,
);
export const StatsIcon = icon(bars);
export const StatsFillIcon = icon(<g fill="currentColor">{bars}</g>);
export const SearchIcon = icon(glass);
export const SearchBoldIcon = icon(glass, 2.7);
export const GearIcon = icon(
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M10.300 2.800h3.400l.5 2.500 1.600.9 2.400-.8 1.700 3-1.900 1.700v1.800l1.900 1.700-1.700 3-2.400-.8-1.600.9-.5 2.500h-3.400l-.5-2.500-1.600-.9-2.400.8-1.700-3 1.900-1.700v-1.8L4.100 8.400l1.7-3 2.400.8 1.600-.9z" />
  </>,
);
export const BackIcon = icon(<path d="M14.500 5l-7 7 7 7" />, 2.4);
export const SunIcon = icon(
  <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M19 5l-1.500 1.500M6.500 17.500L5 19" /></>,
);
export const MoonIcon = icon(<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z" />);
export const NightIcon = icon(
  <><path d="M18 15.500A8 8 0 0 1 8.500 6a8 8 0 1 0 9.500 9.500z" fill="currentColor" /><path d="M17 3v5M14.500 5.500h5" /></>,
);
export const PlayIcon = icon(<path d="M8 5.500v13l11-6.500z" fill="currentColor" />);
export const PauseIcon = icon(<path d="M8.500 5.500v13M15.500 5.500v13" />, 3);
export const PreviousIcon = icon(<path d="M14 6l-6 6 6 6" />);
export const NextIcon = icon(<path d="M10 6l6 6-6 6" />);
