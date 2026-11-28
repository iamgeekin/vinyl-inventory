import type { LandscapeLayout } from '../data/types';
import { useApp } from '../state/AppContext';

const OPTIONS: Record<LandscapeLayout, { label: string; hint: string; picture: string }> = {
  pullout: {
    label: 'Pull-out shelf',
    hint: 'Spines on a shelf, with the cover and disc in focus pulled out. Swipe sideways.',
    // Spines either side of a sleeve with its disc.
    picture: 'M4 8h3v24H4zM9 8h3v24H9zM14 18h14v14H14zM28 20a6 6 0 0 1 0 10M34 8h3v24h-3z',
  },
  crate: {
    label: 'Crate dig',
    hint: 'Flip through sleeves in a crate. Swipe down for the next, up to go back.',
    // Sleeves standing one behind another in a crate.
    picture: 'M13 8h14M11 12h18M9 16h22v12H9zM6 28h28v6H6z',
  },
};

export function LandscapePicker() {
  const { settings, saveSettings } = useApp();
  const chosen: LandscapeLayout = settings.landscapeLayout === 'crate' ? 'crate' : 'pullout';

  return (
    <div className="choices" role="radiogroup" aria-label="Landscape layout">
      {(Object.keys(OPTIONS) as LandscapeLayout[]).map((value) => (
        <label key={value}>
          <svg className="choice-swatch" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <path d={OPTIONS[value].picture} />
          </svg>
          <span className="choice-text">
            <strong>{OPTIONS[value].label}</strong>
            <span className="muted small">{OPTIONS[value].hint}</span>
          </span>
          <input
            type="radio"
            name="landscape-layout"
            checked={chosen === value}
            onChange={() => saveSettings({ landscapeLayout: value })}
          />
        </label>
      ))}
    </div>
  );
}
