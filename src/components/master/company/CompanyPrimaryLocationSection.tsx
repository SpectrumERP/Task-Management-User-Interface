import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { type TimeZoneOptionLike, formatTimeZoneDisplay } from '@/lib/windowsTimeZones';

import { LocationCityField } from './CompanyLocationModal';

const fieldClass = FIELD_CONTROL_CLASS;

interface CompanyPrimaryLocationSectionProps {
  locationTypes: any[];
  countries: any[];
  statesList: any[];
  stateNo?: string | number | null;
  locType: string;
  setLocType: (val: string) => void;
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
  timeZones: TimeZoneOptionLike[];
  companyTimeZoneNo: string;
  setCompanyTimeZoneNo: (val: string) => void;
  selectedTimeZoneName?: string;
  setSelectedTimeZoneName?: (val: string) => void;
}

export function CompanyPrimaryLocationSection({
  locationTypes,
  countries,
  statesList,
  stateNo,
  locType,
  setLocType,
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
  companyTimeZoneNo,
  setCompanyTimeZoneNo,
  selectedTimeZoneName,
  setSelectedTimeZoneName,
}: CompanyPrimaryLocationSectionProps) {
  const timeZoneOptions = useMemo(() => {
    const opts = timeZones.map((tz: any) => ({
      label: tz.timeZoneName || tz.crmTimeZoneName || tz.name || tz.displayName || '',
      value: String(tz.timeZoneNo || tz.crmTimeZoneNo || tz.id || ''),
    }));
    if (
      companyTimeZoneNo &&
      selectedTimeZoneName &&
      !opts.some((o) => o.value === companyTimeZoneNo)
    ) {
      return [
        ...opts,
        {
          value: companyTimeZoneNo,
          label: formatTimeZoneDisplay(selectedTimeZoneName),
        },
      ];
    }
    return opts;
  }, [timeZones, companyTimeZoneNo, selectedTimeZoneName]);

  return (
    <div className="pt-6 mt-6 border-t border-[var(--tm-border)]/70">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3.5">

        <div className="space-y-1.5 min-w-0 sm:col-span-1 lg:col-span-1">
          <FieldLabel required>Location Type</FieldLabel>
          <FieldControl error={locErrors.type}>
            <Combobox
              options={locationTypes.map((lt: any) => ({
                label: lt.locationTypeName,
                value: lt.locationTypeNo.toString(),
              }))}
              value={locType}
              onChange={(val) => {
                setLocType(val);
                if (locErrors.type) setLocErrors((prev) => ({ ...prev, type: '' }));
              }}
              placeholder="Select Location Type"
              className={cn(fieldClass, 'px-3 w-full sm:max-w-md', locErrors.type && 'border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2">
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

        <div className="space-y-1.5 min-w-0 sm:col-span-1 lg:col-span-1">
          <FieldLabel>Timezone</FieldLabel>
          <Combobox
            options={timeZoneOptions}
            value={companyTimeZoneNo}
            onChange={(val) => {
              setCompanyTimeZoneNo(val);
              const opt = timeZoneOptions.find((o) => o.value === val);
              setSelectedTimeZoneName?.(opt?.label || '');
            }}
            placeholder="Select timezone"
            searchPlaceholder="Search timezone..."
            sortAlphabetically={false}
            className={cn(fieldClass, 'px-3 min-w-0 w-full')}
            contentClassName="min-w-[min(100vw-2rem,28rem)] w-[var(--radix-popover-trigger-width)]"
          />
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-3">
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
      </div>
    </div>
  );
}
