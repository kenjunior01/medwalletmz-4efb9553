import { useState, useEffect, createContext, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'medwallet-theme' }: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      setResolvedTheme(systemTheme);

      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      root.classList.add(theme);
      setResolvedTheme(theme);
    }
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    setTheme: (t: Theme) => {
      localStorage.setItem('medwallet-theme', t);
      setTheme(t);
    },
    resolvedTheme
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
