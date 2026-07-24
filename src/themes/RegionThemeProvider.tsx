/**
 * RegionThemeProvider — Applies region-specific CSS variables and theme effects
 * 
 * Integrates with the existing CountryContext branding system,
 * extending it with the full theme: gradients, particles, patterns, logo colors.
 */
import { useEffect, useMemo } from 'react';
import { getTheme, REGION_META } from '@/themes';
import type { RegionTheme } from '@/themes';

interface RegionThemeProviderProps {
  countryId: string;
  children: React.ReactNode;
}

/**
 * Hook to get the full theme for the current country.
 * Can be used in any component to access region-specific styling.
 */
export function useRegionTheme(countryId?: string): RegionTheme {
  return useMemo(() => getTheme(countryId || 'MZ'), [countryId]);
}

/**
 * Provider that applies region-specific CSS custom properties to :root.
 * Works alongside the existing CountryContext system.
 */
export function RegionThemeProvider({ countryId, children }: RegionThemeProviderProps) {
  const theme = useMemo(() => getTheme(countryId), [countryId]);

  useEffect(() => {
    const root = document.documentElement;

    // Apply all region theme colors as CSS custom properties
    root.style.setProperty('--region-primary', theme.colors.primary);
    root.style.setProperty('--region-primary-light', theme.colors.primaryLight);
    root.style.setProperty('--region-primary-dark', theme.colors.primaryDark);
    root.style.setProperty('--region-secondary', theme.colors.secondary);
    root.style.setProperty('--region-secondary-light', theme.colors.secondaryLight);
    root.style.setProperty('--region-accent', theme.colors.accent);
    root.style.setProperty('--region-accent-light', theme.colors.accentLight);
    root.style.setProperty('--region-bg', theme.colors.background);
    root.style.setProperty('--region-surface', theme.colors.surface);
    root.style.setProperty('--region-text', theme.colors.text);
    root.style.setProperty('--region-text-muted', theme.colors.textMuted);

    // Gradients
    root.style.setProperty('--region-gradient-hero', theme.gradients.hero);
    root.style.setProperty('--region-gradient-card', theme.gradients.card);
    root.style.setProperty('--region-gradient-accent', theme.gradients.accent);
    root.style.setProperty('--region-gradient-dark', theme.gradients.dark);

    // Logo
    root.style.setProperty('--region-logo-primary', theme.logo.primary);
    root.style.setProperty('--region-logo-secondary', theme.logo.secondary);
    root.style.setProperty('--region-logo-accent', theme.logo.accent);
    root.style.setProperty('--region-logo-glow', theme.logo.glow);

    // Set data attribute for CSS selectors
    root.setAttribute('data-region', countryId);
    root.setAttribute('data-region-group', theme.region);

    return () => {
      root.removeAttribute('data-region');
      root.removeAttribute('data-region-group');
    };
  }, [theme, countryId]);

  return <>{children}</>;
}

/**
 * Get region metadata (label, flag, description)
 */
export function getRegionMeta(region: string) {
  return REGION_META[region] || { label: region, flag: '🌐', description: '' };
}

export default RegionThemeProvider;
