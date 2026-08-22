import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <DialogContent className="rounded-3xl max-w-3xl p-6 border-none shadow-2xl bg-white select-none">
        <DialogHeader className="pb-3 border-b border-slate-150">
          <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
            <MapPin size={18} className="text-[#006699]" />
            {editingIndex !== null ? 'Edit Location Address' : 'Add Location Address'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 pr-2">
          <div className="space-y-0">
            <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Location Type <span className="text-red-500">*</span></label>
            <Combobox
              options={locationTypes.map((lt: any) => ({ label: lt.locationTypeName, value: lt.locationTypeNo.toString() }))}
              value={locType}
              onChange={(val) => {
                setLocType(val);
                if (locErrors.type) setLocErrors(prev => ({ ...prev, type: '' }));
              }}
              placeholder="Select Location Type"
              className={cn(
                "bg-white border hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                locErrors.type ? "border-red-500" : "border-slate-200"
              )}
            />
            {locErrors.type && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.type}</p>}
          </div>

          <div className="space-y-0">
            <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Address <span className="text-red-500">*</span></label>
            <textarea
              rows={2}
              placeholder="Enter address"
              value={locAddress}
              onChange={(e) => {
                setLocAddress(e.target.value);
                if (locErrors.address) setLocErrors(prev => ({ ...prev, address: '' }));
              }}
              className={cn(
                "bg-white border border-slate-200 hover:border-slate-300 transition-colors py-2 px-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20 min-h-[50px] resize-y",
                locErrors.address && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
            />
            {locErrors.address && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Country</label>
              <Combobox
                options={countries.map((c: any) => ({ label: c.countryName, value: c.countryName }))}
                value={locCountry}
                onChange={onCountryChange}
                placeholder="Select country"
                className={cn(
                  "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  locErrors.country && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {locErrors.country && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.country}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">State</label>
              <Combobox
                options={statesList.map((s: any) => ({ label: s.stateName, value: s.stateName }))}
                value={locState}
                onChange={onStateChange}
                placeholder="Select state"
                className={cn(
                  "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  locErrors.state && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {locErrors.state && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.state}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">City</label>
              <Combobox
                options={citiesList.map((ci: any) => ({ label: ci.cityName, value: ci.cityName }))}
                value={locCity}
                onChange={(val) => {
                  setLocCity(val);
                  if (locErrors.city) setLocErrors(prev => ({ ...prev, city: '' }));
                }}
                placeholder="Select city"
                className={cn(
                  "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  locErrors.city && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {locErrors.city && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.city}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">PIN / ZIP Code</label>
              <Input placeholder="Enter PIN / ZIP Code" value={locPin} maxLength={10} onChange={(e) => {
                setLocPin(e.target.value);
                if (locErrors.pin) setLocErrors(prev => ({ ...prev, pin: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  locErrors.pin && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {locErrors.pin && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.pin}</p>}
            </div>
            <div className="space-y-0 col-span-2">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Map URL</label>
              <Input placeholder="Enter Map URL" value={locMapUrl} maxLength={2000} onChange={(e) => setLocMapUrl(e.target.value)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>
            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Latitude</label>
              <Input placeholder="Enter Latitude" value={locLatitude} maxLength={15} onChange={(e) => setLocLatitude(e.target.value)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>
            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Longitude</label>
              <Input placeholder="Enter Longitude" value={locLongitude} maxLength={15} onChange={(e) => setLocLongitude(e.target.value)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-150 flex justify-end gap-0.5 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-3xl">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
            Cancel
          </Button>
          <Button type="button" onClick={onSave} className="rounded-xl h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white">
            {editingIndex !== null ? 'Save Changes' : 'Add Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
