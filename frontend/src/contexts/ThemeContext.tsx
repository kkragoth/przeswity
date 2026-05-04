import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export enum Theme {
    Light = 'light',
    PaperWhite = 'paper-white',
    Dark = 'dark',
}

const STORAGE_KEY = 'app.theme';
const THEME_ORDER: readonly Theme[] = [Theme.Light, Theme.PaperWhite, Theme.Dark];

const isTheme = (value: unknown): value is Theme =>
    value === Theme.Light || value === Theme.PaperWhite || value === Theme.Dark;

const readStoredTheme = (): Theme => {
    if (typeof window === 'undefined') return Theme.Light;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (isTheme(raw)) return raw;
    } catch {
        /* localStorage unavailable */
    }
    return Theme.Light;
};

const nextTheme = (current: Theme): Theme => {
    const idx = THEME_ORDER.indexOf(current);
    return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
};

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.classList.toggle('dark', theme === Theme.Dark);
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* localStorage unavailable */
        }
    }, [theme]);

    const value: ThemeContextValue = {
        theme,
        setTheme: setThemeState,
        cycleTheme: () => setThemeState(nextTheme),
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
