import { guessWindowsTimeZone } from '@/lib/timezoneGuesser';
import {
  type TimeZoneOptionLike,
  buildTimeZoneComboboxOptions,
  formatTimeZoneDisplay,
} from '@/lib/windowsTimeZones';

/** Business entity fill-values time zone row (`crmTimeZoneNo`, `countryNo`). */
export type LocationTimeZone = TimeZoneOptionLike & { countryNo?: number | string | null };

const tzNo = (tz: LocationTimeZone) => String(tz.crmTimeZoneNo ?? tz.timeZoneNo ?? '');
const tzName = (tz: LocationTimeZone) => String(tz.crmTimeZoneName ?? tz.timeZoneName ?? '');

function timeZonesInCountry(timeZones: LocationTimeZone[], countryNo: number | null) {
  if (countryNo == null) return [];
  return timeZones.filter((tz) => tz.countryNo != null && String(tz.countryNo) === String(countryNo));
}

/**
 * Time zone to pre-select for a location: the country's only zone, otherwise the
 * zone guessed from country/state/city (searched within the country when it has zones).
 */
export function suggestLocationTimeZoneNo(
  timeZones: LocationTimeZone[],
  countryNo: number | null,
  country: string,
  state: string,
  city: string
): string | null {
  const inCountry = timeZonesInCountry(timeZones, countryNo);
  if (inCountry.length === 1) return tzNo(inCountry[0]);

  const guessed = guessWindowsTimeZone(country, state, city);
  if (!guessed) return null;
  const match = (inCountry.length ? inCountry : timeZones).find((tz) => tzName(tz) === guessed);
  return match ? tzNo(match) : null;
}

/** True when the country has more than one zone, so state/city can change the pick. */
export function countryHasMultipleTimeZones(timeZones: LocationTimeZone[], countryNo: number | null) {
  return timeZonesInCountry(timeZones, countryNo).length > 1;
}

/** Combobox options limited to the country's zones (all zones when the country has none mapped). */
export function buildLocationTimeZoneOptions(
  timeZones: LocationTimeZone[],
  countryNo: number | null,
  selectedNo: string,
  selectedName?: string
) {
  const inCountry = timeZonesInCountry(timeZones, countryNo);
  const options = buildTimeZoneComboboxOptions(inCountry.length ? inCountry : timeZones);
  if (selectedNo && !options.some((o) => o.value === selectedNo)) {
    options.push({ value: selectedNo, label: getLocationTimeZoneLabel(timeZones, selectedNo, selectedName) });
  }
  return options;
}

export function getLocationTimeZoneLabel(
  timeZones: LocationTimeZone[],
  timeZoneNo: string | number | null | undefined,
  fallbackName?: string
) {
  if (timeZoneNo == null || timeZoneNo === '') return '';
  const tz = timeZones.find((t) => tzNo(t) === String(timeZoneNo));
  return formatTimeZoneDisplay(tz ?? fallbackName) || fallbackName || '';
}
