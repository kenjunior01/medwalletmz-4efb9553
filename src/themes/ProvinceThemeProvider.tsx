/**
 * ProvinceThemeProvider — Applies province-specific CSS variables and visual effects
 * 
 * Reads the selected province from localStorage / context, then:
 *  - Sets CSS custom properties on :root for the province colors and gradients
 *  - Adds data-province="XX" attribute to <html> for CSS selectors
 *  - Falls back to the country-level theme when no province is selected
 * 
 * Designed to wrap INSIDE the existing RegionThemeProvider so that
 * province-level variables take precedence over region-level ones.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { getProvinceTheme, getProvinceThemeOrDefault, PROVINCE_STORAGE_KEY, provinces } from './provinces';
import type { ProvinceTheme } from './provinces';

interface ProvinceContextValue {
  /** Currently selected province theme, or undefined if none selected */
  province: ProvinceTheme | undefined;
  /** All available province themes */
  provinces: ProvinceTheme[];
  /** Select a province by id (persists to localStorage) */
  selectProvince: (provinceId: string | null) => void;
  /** Clear province selection, reverting to country-level theme */
  clearProvince: () => void;
}

const ProvinceContext = createContext<ProvinceContextValue>({
  province: undefined,
  provinces,
  selectProvince: () => {},
  clearProvince: () => {},
});

/**
 * Hook to access the current province theme and selection controls.
 * Must be used inside a ProvinceProvider.
 */
export function useProvince(): ProvinceContextValue {
  return useContext(ProvinceContext);
}

interface ProvinceProviderProps {
  children: ReactNode;
  /** Optional initial province id. If omitted, reads from localStorage. */
  initialProvinceId?: string | null;
}

/**
 * Provider that manages province-level visual identity.
 * 
 * - Reads province selection from localStorage on mount
 * - Applies CSS custom properties for the active province theme
 * - Sets data-province attribute on <html> element
 * - Falls back to country-level theme when no province is selected
 */
export function ProvinceProvider({ children, initialProvinceId }: ProvinceProviderProps) {
  const [provinceId, setProvinceId] = useState<string | null>(
    () => initialProvinceId ?? localStorage.getItem(PROVINCE_STORAGE_KEY)
  );

  const province = useMemo(
    () => (provinceId ? getProvinceTheme(provinceId) : undefined),
    [provinceId]
  );

  const selectProvince = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(PROVINCE_STORAGE_KEY, id);
      setProvinceId(id);
    } else {
      localStorage.removeItem(PROVINCE_STORAGE_KEY);
      setProvinceId(null);
    }
  }, []);

  const clearProvince = useCallback(() => {
    localStorage.removeItem(PROVINCE_STORAGE_KEY);
    setProvinceId(null);
  }, []);

  // Apply CSS custom properties when province changes
  useEffect(() => {
    const root = document.documentElement;

    if (province) {
      // Province-level custom properties (take precedence over region-level)
      root.style.setProperty('--province-primary', province.colors.primary);
      root.style.setProperty('--province-primary-light', province.colors.primaryLight);
      root.style.setProperty('--province-primary-dark', province.colors.primaryDark);
      root.style.setProperty('--province-secondary', province.colors.secondary);
      root.style.setProperty('--province-secondary-light', province.colors.secondaryLight);
      root.style.setProperty('--province-accent', province.colors.accent);
      root.style.setProperty('--province-bg', province.colors.background);
      root.style.setProperty('--province-surface', province.colors.surface);

      // Gradients
      root.style.setProperty('--province-gradient-hero', province.gradients.hero);
      root.style.setProperty('--province-gradient-card', province.gradients.card);
      root.style.setProperty('--province-gradient-accent', province.gradients.accent);
      root.style.setProperty('--province-gradient-dark', province.gradients.dark);

      // Set data attribute for CSS selectors
      root.setAttribute('data-province', province.id);
    } else {
      // No province selected — remove province-specific properties
      root.removeAttribute('data-province');
      root.style.removeProperty('--province-primary');
      root.style.removeProperty('--province-primary-light');
      root.style.removeProperty('--province-primary-dark');
      root.style.removeProperty('--province-secondary');
      root.style.removeProperty('--province-secondary-light');
      root.style.removeProperty('--province-accent');
      root.style.removeProperty('--province-bg');
      root.style.removeProperty('--province-surface');
      root.style.removeProperty('--province-gradient-hero');
      root.style.removeProperty('--province-gradient-card');
      root.style.removeProperty('--province-gradient-accent');
      root.style.removeProperty('--province-gradient-dark');
    }

    return () => {
      root.removeAttribute('data-province');
    };
  }, [province]);

  const contextValue = useMemo<ProvinceContextValue>(() => ({
    province,
    provinces,
    selectProvince,
    clearProvince,
  }), [province, selectProvince, clearProvince]);

  return (
    <ProvinceContext.Provider value={contextValue}>
      {children}
    </ProvinceContext.Provider>
  );
}

export default ProvinceProvider;
