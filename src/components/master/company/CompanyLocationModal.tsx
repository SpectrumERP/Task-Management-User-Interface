import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import type { CityComboRow } from '../shared/geo';
import { useCityComboSearch } from '../shared/useCityComboSearch';

const fieldClass = FIELD_CONTROL_CLASS;

interface LocationCityFieldProps {
  stateNo?: string | number | null;
  cityNo: string;
  cityName: string;
  error?: string;
  onSelect: (city: CityComboRow | null) => void;
  onAddNew: () => void;
}

/**
 * Searchable City combobox (same behaviour as the Task Location master):
 * keyword search across all cities, narrowed by state when one is chosen.
 * Rendered inside DialogContent so the search resets each time the dialog opens.
 */
function LocationCityField({ stateNo, cityNo, cityName, error, onSelect, onAddNew }: LocationCityFieldProps) {
  const [citySearch, setCitySearch] = useState('');
  const cities = useCityComboSearch(citySearch, stateNo);

  const value = cityNo || cityName;
  const options = cities.map((c) => ({
    label: c.cityName || '',
    value: (c.cityNo ?? '').toString(),
    description: [c.stateName, c.countryName].filter(Boolean).join(', '),
  }));
  // Keep the chosen city labelled when it is not in the current search results
  if (value && !options.some((o) => o.value === value)) {
    options.push({ label: cityName, value, description: '' });
  }

  return (
    <Combobox
      options={options}
      value={value}
      onChange={(val) => {
        if (!val) {
          onSelect(null);
          return;
        }
        const city = cities.find((c) => (c.cityNo ?? '').toString() === val);
        if (city) onSelect(city);
      }}
      onSearchChange={setCitySearch}
      shouldFilter={false}
      placeholder="Select city"
      searchPlaceholder="Search city..."
      className={cn(fieldClass, 'px-3', error && 'border-red-400')}
      onAddNew={onAddNew}
    />
  );
}

interface CompanyLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIndex: number | null;
  locationTypes: any[];
  countries: any[];
  statesList: any[];
  /** Selected state's id — narrows the city search */
  stateNo?: string | number | null;
  locType: string;
  setLocType: (v: string) => void;
  locAddress: string;
  setLocAddress: (v: string) => void;
  locCountry: string;
  onCountryChange: (val: string) => void;
  locState: string;
  onStateChange: (val: string) => void;
  locCity: string;
  locCityNo: string;
  onCitySelect: (city: CityComboRow | null) => void;
  onAddNewCity: () => void;
  locPin: string;
  setLocPin: (v: string) => void;
  locMapUrl: string;
  setLocMapUrl: (v: string) => void;
  locLatitude: string;
  setLocLatitude: (v: string) => void;
  locLongitude: string;
  setLocLongitude: (v: string) => void;
  locErrors: Record<string, string>;
  setLocErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: () => void;
}

export function CompanyLocationModal({
  open,
  onOpenChange,
  editingIndex,
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
  onSave,
}: CompanyLocationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-1.5rem)] max-w-3xl p-0 gap-0 overflow-hidden',
          'max-h-[min(90dvh,900px)] flex flex-col',
          'rounded-[12px] border border-[var(--tm-border)]/80 shadow-xl bg-[var(--tm-surface)] select-none'
        )}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-5 py-3 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
          <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2 pr-6">
            <MapPin size={16} className="text-[#0EA5E9] shrink-0" />
            {editingIndex !== null ? 'Edit Location Address' : 'Add Location Address'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-thin">
          <div className="space-y-1.5">
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
              className={cn(fieldClass, 'px-3', locErrors.type && 'border-red-400')}
            />
            </FieldControl>
          </div>

          <div className="space-y-1.5">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
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
              <FieldLabel>Map URL</FieldLabel>
              <Input
                placeholder="Enter Map URL"
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

        <DialogFooter className="shrink-0 px-4 sm:px-5 py-3 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] flex flex-row justify-end gap-2 rounded-b-[12px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[8px] h-9 text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="rounded-[8px] h-9 text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
          >
            {editingIndex !== null ? 'Save Changes' : 'Add Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
