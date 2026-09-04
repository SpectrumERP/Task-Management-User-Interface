import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIndex: number | null;
  countries: any[];
  statesList: any[];
  citiesList: any[];
  contactName: string;
  setContactName: (v: string) => void;
  contactDesignation: string;
  setContactDesignation: (v: string) => void;
  contactDepartment: string;
  setContactDepartment: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  onEmailBlur: () => void;
  contactAddress: string;
  setContactAddress: (v: string) => void;
  contactCountry: string;
  onCountryChange: (val: string) => void;
  contactState: string;
  onStateChange: (val: string) => void;
  contactCity: string;
  setContactCity: (v: string) => void;
  contactPinCode: string;
  setContactPinCode: (v: string) => void;
  contactStatus: string;
  setContactStatus: (v: string) => void;
  contactErrors: Record<string, string>;
  setContactErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: () => void;
}

export function CompanyContactModal({
  open,
  onOpenChange,
  editingIndex,
  countries,
  statesList,
  citiesList,
  contactName,
  setContactName,
  contactDesignation,
  setContactDesignation,
  contactDepartment,
  setContactDepartment,
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  onEmailBlur,
  contactAddress,
  setContactAddress,
  contactCountry,
  onCountryChange,
  contactState,
  onStateChange,
  contactCity,
  setContactCity,
  contactPinCode,
  setContactPinCode,
  contactStatus,
  setContactStatus,
  contactErrors,
  setContactErrors,
  onSave,
}: CompanyContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-3xl p-6 border-none shadow-2xl bg-white select-none">
        <DialogHeader className="pb-3 border-b border-slate-150">
          <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
            <User size={18} className="text-[#006699]" />
            {editingIndex !== null ? 'Edit Contact Person' : 'Add Contact Person'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 pr-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0 col-span-2">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Contact Person Name</label>
              <Input placeholder="Enter contact person name" value={contactName} onChange={(e) => {
                setContactName(e.target.value);
                if (contactErrors.name) setContactErrors(prev => ({ ...prev, name: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.name && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.name}</p>}
            </div>
            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Designation</label>
              <Input placeholder="Enter designation" value={contactDesignation} onChange={(e) => {
                setContactDesignation(e.target.value);
                if (contactErrors.designation) setContactErrors(prev => ({ ...prev, designation: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.designation && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.designation && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.designation}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Department</label>
              <Input placeholder="Enter department" value={contactDepartment} onChange={(e) => {
                setContactDepartment(e.target.value);
                if (contactErrors.department) setContactErrors(prev => ({ ...prev, department: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.department && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.department && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.department}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Phone</label>
              <Input placeholder="Enter phone" value={contactPhone} onChange={(e) => {
                const val = e.target.value.replace(/[^\d+()\-\s]/g, '');
                setContactPhone(val);
                if (contactErrors.phone) setContactErrors(prev => ({ ...prev, phone: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.phone && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.phone && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.phone}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Email</label>
              <Input placeholder="Enter email" value={contactEmail} onBlur={onEmailBlur} onChange={(e) => {
                setContactEmail(e.target.value);
                if (contactErrors.email) setContactErrors(prev => ({ ...prev, email: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.email && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.email && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.email}</p>}
            </div>

            <div className="space-y-0 col-span-2">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Address</label>
              <Input placeholder="Enter address" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)}
                className="bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Country</label>
              <Combobox
                options={countries.map((c: any) => ({ label: c.countryName, value: c.countryName }))}
                value={contactCountry}
                onChange={onCountryChange}
                placeholder="Select country"
                className={cn(
                  "bg-white border border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.country && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.country && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.country}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">State</label>
              <Combobox
                options={statesList.map((s: any) => ({ label: s.stateName, value: s.stateName }))}
                value={contactState}
                onChange={onStateChange}
                placeholder="Select state"
                className={cn(
                  "bg-white border border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.state && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.state && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.state}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">City</label>
              <Combobox
                options={citiesList.map((ci: any) => ({ label: ci.cityName, value: ci.cityName }))}
                value={contactCity}
                onChange={(val) => {
                  setContactCity(val);
                  if (contactErrors.city) setContactErrors(prev => ({ ...prev, city: '' }));
                }}
                placeholder="Select city"
                className={cn(
                  "bg-white border border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.city && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.city && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.city}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">PIN/Zip Code</label>
              <Input placeholder="Enter PIN/Zip Code" value={contactPinCode} maxLength={10} onChange={(e) => {
                setContactPinCode(e.target.value);
                if (contactErrors.pinCode) setContactErrors(prev => ({ ...prev, pinCode: '' }));
              }}
                className={cn(
                  "bg-white border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  contactErrors.pinCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {contactErrors.pinCode && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.pinCode}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Status</label>
              <Combobox
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' }
                ]}
                value={contactStatus}
                onChange={(val) => setContactStatus(val)}
                placeholder="Select status"
                className="bg-white border border-[#a8afb7] hover:border-[#006699]/35 transition-colors h-9 rounded-[8px] px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-150 flex justify-end gap-0.5 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-3xl">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-[8px] h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
            Cancel
          </Button>
          <Button type="button" onClick={onSave} className="rounded-[8px] h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white">
            {editingIndex !== null ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
