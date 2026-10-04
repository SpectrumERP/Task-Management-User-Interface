import { useEffect, useState } from 'react';
import { fetchCityCombo, type CityComboRow } from './geo';

/**
 * Debounced city lookup for searchable City comboboxes.
 * Searches every city by keyword, narrowed to `stateNo` when a state is selected;
 * stays empty until there is a keyword or a state.
 */
export function useCityComboSearch(search: string, stateNo?: string | number | null) {
  const [cities, setCities] = useState<CityComboRow[]>([]);
  const enabled = Boolean(search || stateNo);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchCityCombo(search, stateNo).then((rows) => {
        if (!cancelled) setCities(rows);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, search, stateNo]);

  return enabled ? cities : [];
}
