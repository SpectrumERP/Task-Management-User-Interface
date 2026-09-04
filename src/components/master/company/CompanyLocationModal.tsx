import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';

const fieldClass = FIELD_CONTROL_CLASS;

interface CompanyLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIndex: number | null;
  locationTypes: any[];
  countries: any[];
  statesList: any[];
  citiesList: any[];
  locType: string;
  setLocType: (v: string) => void;
  locAddress: string;
  setLocAddress: (v: string) => void;
  locCountry: string;
  onCountryChange: (val: string) => void;
  locState: string;
  onStateChange: (val: string) => void;
  locCity: string;
  setLocCity: (v: string) => void;
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
  citiesList,
  locType,
  setLocType,
  locAddress,
  setLocAddress,
  locCountry,
  onCountryChange,
  locState,
  onStateChange,
  locCity,
  setLocCity,
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
          'rounded-[12px] border border-slate-200/80 shadow-xl bg-white select-none'
        )}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-100 bg-[#f8fbfd]">
          <DialogTitle className="text-base font-semibold text-slate-800 tracking-tight flex items-center gap-2 pr-6">
            <MapPin size={16} className="text-[#006699] shrink-0" />
            {editingIndex !== null ? 'Edit Location Address' : 'Add Location Address'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-thin">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">
              Location Type <span className="text-red-500">*</span>
            </label>
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
            {locErrors.type ? (
              <p className="text-[10px] text-red-500 font-medium">{locErrors.type}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Enter address"
              value={locAddress}
              onChange={(e) => {
                setLocAddress(e.target.value);
                if (locErrors.address) setLocErrors((prev) => ({ ...prev, address: '' }));
              }}
              className={cn(
                'w-full rounded-[8px] border border-[#a8afb7] bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-none resize-none min-h-[56px]',
                'focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]',
                locErrors.address && 'border-red-400 focus:ring-red-500/10 focus:border-red-400'
              )}
            />
            {locErrors.address ? (
              <p className="text-[10px] text-red-500 font-medium">{locErrors.address}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">Country</label>
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
              {locErrors.country ? (
                <p className="text-[10px] text-red-500 font-medium">{locErrors.country}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">State</label>
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
              {locErrors.state ? (
                <p className="text-[10px] text-red-500 font-medium">{locErrors.state}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">City</label>
              <Combobox
                options={citiesList.map((ci: any) => ({
                  label: ci.cityName,
                  value: ci.cityName,
                }))}
                value={locCity}
                onChange={(val) => {
                  setLocCity(val);
                  if (locErrors.city) setLocErrors((prev) => ({ ...prev, city: '' }));
                }}
                placeholder="Select city"
                className={cn(fieldClass, 'px-3', locErrors.city && 'border-red-400')}
              />
              {locErrors.city ? (
                <p className="text-[10px] text-red-500 font-medium">{locErrors.city}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">PIN / ZIP Code</label>
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
              {locErrors.pin ? (
                <p className="text-[10px] text-red-500 font-medium">{locErrors.pin}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-600">Map URL</label>
              <Input
                placeholder="Enter Map URL"
                value={locMapUrl}
                maxLength={2000}
                onChange={(e) => setLocMapUrl(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">Latitude</label>
              <Input
                placeholder="Enter Latitude"
                value={locLatitude}
                maxLength={15}
                onChange={(e) => setLocLatitude(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-600">Longitude</label>
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

        <DialogFooter className="shrink-0 px-4 sm:px-5 py-3 border-t border-slate-100 bg-[#f8fbfd] flex flex-row justify-end gap-2 rounded-b-[12px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[8px] h-9 text-xs font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="rounded-[8px] h-9 text-xs font-semibold bg-[#006699] hover:bg-[#005580] text-white shadow-sm"
          >
            {editingIndex !== null ? 'Save Changes' : 'Add Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
