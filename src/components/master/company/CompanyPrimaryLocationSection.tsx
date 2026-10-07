import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import React, { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

import { LocationCityField } from './CompanyLocationModal';
import { type LocationTimeZone, buildLocationTimeZoneOptions } from './locationTimeZone';

const fieldClass = FIELD_CONTROL_CLASS;

interface CompanyPrimaryLocationSectionProps {
  countries: any[];
  /** Selected country's id — narrows the time zone list */
  countryNo: number | null;
  statesList: any[];
  stateNo?: string | number | null;
  locAddress: string;
  setLocAddress: (val: string) => void;
  locCountry: string;
  onCountryChange: (val: string) => void;
  locState: string;
  onStateChange: (val: string) => void;
  locCity: string;
  locCityNo: string;
  onCitySelect: (city: any | null) => void;
  onAddNewCity: () => void;
  locPin: string;
  setLocPin: (val: string) => void;
  locMapUrl: string;
  setLocMapUrl: (val: string) => void;
  locLatitude: string;
  setLocLatitude: (val: string) => void;
  locLongitude: string;
  setLocLongitude: (val: string) => void;
  locErrors: Record<string, string>;
  setLocErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  timeZones: LocationTimeZone[];
  timeZoneNo: string;
  setTimeZoneNo: (val: string) => void;
  /** Name from load-data, shown when the zone is missing from fill-values */
  timeZoneName?: string;
}

export function CompanyPrimaryLocationSection({
  countries,
  countryNo,
  statesList,
  stateNo,
  locAddress,
  setLocAddress,
  locCountry,
  onCountryChange,
  locState,
  onStateChange,
  locCity,
  locCityNo,
  onCitySelect,
  onAddNewCity,
  locPin,
  setLocPin,
  locMapUrl,
  setLocMapUrl,
  locLatitude,
  setLocLatitude,
  locLongitude,
  setLocLongitude,
  locErrors,
  setLocErrors,
  timeZones,
  timeZoneNo,
  setTimeZoneNo,
  timeZoneName,
}: CompanyPrimaryLocationSectionProps) {
  const timeZoneOptions = useMemo(
    () => buildLocationTimeZoneOptions(timeZones, countryNo, timeZoneNo, timeZoneName),
    [timeZones, countryNo, timeZoneNo, timeZoneName]
  );

  const [showMapFields, setShowMapFields] = useState(false);
  // Rarely used — keep hidden until asked for, but always show when a value exists
  const mapFieldsVisible = showMapFields || !!(locMapUrl || locLatitude || locLongitude);

  return (
    <div className="mt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5">

        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-4">
          <FieldLabel required>Address</FieldLabel>
          <FieldControl error={locErrors.address}>
            <textarea
              rows={2}
              placeholder="Enter address"
              value={locAddress}
              onChange={(e) => {
                setLocAddress(e.target.value);
                if (locErrors.address) setLocErrors((prev) => ({ ...prev, address: '' }));
              }}
              className={cn(
                'w-full rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-3 py-2 text-xs font-medium text-slate-200 shadow-none resize-none min-h-[56px]',
                'focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]',
                locErrors.address && 'border-red-400 focus:ring-red-500/10 focus:border-red-400'
              )}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel>Country</FieldLabel>
          <FieldControl error={locErrors.country}>
            <Combobox
              options={countries.map((c: any) => ({
                label: c.countryName,
                value: c.countryName,
              }))}
              value={locCountry}
              onChange={onCountryChange}
              placeholder="Select country"
              className={cn(fieldClass, 'px-3', locErrors.country && 'border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel>State</FieldLabel>
          <FieldControl error={locErrors.state}>
            <Combobox
              options={statesList.map((s: any) => ({
                label: s.stateName,
                value: s.stateName,
              }))}
              value={locState}
              onChange={onStateChange}
              placeholder="Select state"
              className={cn(fieldClass, 'px-3', locErrors.state && 'border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel>City</FieldLabel>
          <FieldControl error={locErrors.city}>
            <LocationCityField
              stateNo={stateNo}
              cityNo={locCityNo}
              cityName={locCity}
              error={locErrors.city}
              onSelect={onCitySelect}
              onAddNew={onAddNewCity}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel>PIN / ZIP Code</FieldLabel>
          <FieldControl error={locErrors.pin}>
            <Input
              placeholder="Enter PIN / ZIP Code"
              value={locPin}
              maxLength={10}
              onChange={(e) => {
                setLocPin(e.target.value);
                if (locErrors.pin) setLocErrors((prev) => ({ ...prev, pin: '' }));
              }}
              className={cn(fieldClass, locErrors.pin && 'border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2">
          <FieldLabel>Timezone</FieldLabel>
          <Combobox
            options={timeZoneOptions}
            value={timeZoneNo}
            onChange={setTimeZoneNo}
            placeholder="Select timezone"
            searchPlaceholder="Search timezone..."
            sortAlphabetically={false}
            className={cn(fieldClass, 'px-3 min-w-0 w-full')}
            contentClassName="min-w-[min(100vw-2rem,28rem)] w-[var(--radix-popover-trigger-width)]"
          />
        </div>

        {!mapFieldsVisible ? (
          <div className="flex items-end min-w-0 sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowMapFields(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#0EA5E9] hover:bg-[var(--tm-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/30"
            >
              <MapPinned size={14} />
              Add map location
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel>Map Location URL</FieldLabel>
              <Input
                placeholder="Enter/Paste Map Location URL"
                value={locMapUrl}
                maxLength={2000}
                onChange={(e) => setLocMapUrl(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Latitude</FieldLabel>
              <Input
                placeholder="Enter Latitude"
                value={locLatitude}
                maxLength={15}
                onChange={(e) => setLocLatitude(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Longitude</FieldLabel>
              <Input
                placeholder="Enter Longitude"
                value={locLongitude}
                maxLength={15}
                onChange={(e) => setLocLongitude(e.target.value)}
                className={fieldClass}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
