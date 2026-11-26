import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { isHex } from './color';
import { APPEARANCES, NEUTRAL, resolveMode, themeFor, type Appearance, type CoverColors, type Mode, type Theme } from './palette';
import { useMediaQuery } from './useMediaQuery';

interface ThemeState {
  mode: Mode;
  /** The colours currently in focus. */
  colors: CoverColors;
  phonePrefersLight: boolean;
  setAppearance: (appearance: Appearance) => void;
  setColors: (colors: CoverColors) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) throw new Error('useTheme must be used inside ThemeProvider');
  return state;
}

// Remembered so the app opens in the same colours before the collection has loaded.
const STORAGE_KEY = 'vinyl.theme';

function remembered(): { appearance: Appearance; colors: CoverColors } {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      appearance: APPEARANCES.includes(stored.appearance) ? stored.appearance : 'auto',
      colors: isHex(stored.colors?.main ?? '') && isHex(stored.colors?.pop ?? '') ? stored.colors : NEUTRAL,
    };
  } catch {
    return { appearance: 'auto', colors: NEUTRAL };
  }
}

const CSS_NAMES: Record<keyof Theme, string> = {
  bg: '--bg', surface: '--surface', line: '--line', lineStrong: '--line-strong', text: '--text', muted: '--muted',
  accent: '--accent', accentInk: '--accent-ink', glow: '--glow', danger: '--danger', art: '--art',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(remembered);
  const [appearance, setAppearance] = useState(initial.appearance);
  const [colors, setColors] = useState(initial.colors);
  const phonePrefersLight = useMediaQuery('(prefers-color-scheme: light)');
  const mode = resolveMode(appearance, phonePrefersLight);

  useLayoutEffect(() => {
    const theme = themeFor(colors, mode);
    const root = document.documentElement;
    for (const [key, name] of Object.entries(CSS_NAMES)) root.style.setProperty(name, theme[key as keyof Theme]);
    root.style.colorScheme = mode === 'light' ? 'light' : 'dark';
    root.dataset.mode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ appearance, colors }));
    } catch {
      // Private browsing may refuse storage; the theme still applies.
    }
  }, [appearance, colors, mode]);

  const value = useMemo<ThemeState>(
    () => ({
      mode,
      colors,
      phonePrefersLight,
      setAppearance,
      setColors: (next) =>
        setColors((current) => (current.main === next.main && current.pop === next.pop ? current : next)),
    }),
    [mode, colors, phonePrefersLight],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Colours the app after the given cover. `undefined` leaves the colours as they
 * are, and `null` returns to the neutral colours.
 */
export function useCoverTheme(colors: CoverColors | null | undefined) {
  const { setColors } = useTheme();
  const known = colors !== undefined;
  const { main, pop } = colors ?? NEUTRAL;
  useLayoutEffect(() => {
    if (known) setColors({ main, pop });
    // setColors changes identity with every theme change, which must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known, main, pop]);
}
