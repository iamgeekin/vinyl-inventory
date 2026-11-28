import { useApp } from '../state/AppContext';
import { APPEARANCES, themeFor, type Appearance } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

const OPTIONS: Record<Appearance, { label: string; hint: string }> = {
  auto: { label: 'Match my phone', hint: 'Light or dark, following the phone' },
  light: { label: 'Light', hint: 'The cover colours, kept light' },
  dark: { label: 'Dark', hint: 'The cover colours, kept dark' },
  night: { label: 'Night', hint: 'Deepest shade, dimmed art, warm text' },
};

export function AppearancePicker() {
  const { settings, saveSettings } = useApp();
  const { colors } = useTheme();
  const swatch = (appearance: Appearance) =>
    appearance === 'auto'
      ? `linear-gradient(135deg, ${themeFor(colors, 'light').bg} 0 50%, ${themeFor(colors, 'dark').bg} 50% 100%)`
      : themeFor(colors, appearance).bg;

  return (
    <div className="choices" role="radiogroup" aria-label="Appearance">
      {APPEARANCES.map((value) => (
        <label key={value}>
          <span className="choice-swatch" style={{ background: swatch(value) }} aria-hidden="true" />
          <span className="choice-text">
            <strong>{OPTIONS[value].label}</strong>
            <span className="muted small">{OPTIONS[value].hint}</span>
          </span>
          <input
            type="radio"
            name="appearance"
            checked={settings.appearance === value}
            onChange={() => saveSettings({ appearance: value })}
          />
        </label>
      ))}
    </div>
  );
}
