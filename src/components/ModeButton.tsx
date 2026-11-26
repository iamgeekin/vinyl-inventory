import { useApp } from '../state/AppContext';
import { nextMode, type Mode } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { MoonIcon, NightIcon, SunIcon } from './Icons';

const ICONS: Record<Mode, () => React.JSX.Element> = { light: SunIcon, dark: MoonIcon, night: NightIcon };

/** Steps through light, dark and night. */
export function ModeButton() {
  const { mode } = useTheme();
  const { saveSettings } = useApp();
  const next = nextMode(mode);
  const Icon = ICONS[mode];
  return (
    <button
      type="button"
      className="mode-button"
      aria-label={`Appearance: ${mode}. Switch to ${next}`}
      onClick={() => saveSettings({ appearance: next })}
    >
      <Icon />
    </button>
  );
}
