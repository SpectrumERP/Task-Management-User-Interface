import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';

const fieldClass = FIELD_CONTROL_CLASS;

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
      <DialogContent
        className={cn(
          'w-[calc(100vw-1.5rem)] max-w-3xl p-0 gap-0 overflow-hidden',
          'max-h-[min(90dvh,900px)] flex flex-col',
          'rounded-[12px] border border-[var(--tm-border)]/80 shadow-xl bg-[var(--tm-surface)] select-none'
        )}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-5 py-3 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
          <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2 pr-6">
            <User size={16} className="text-[#0EA5E9] shrink-0" />
            {editingIndex !== null ? 'Edit Contact Person' : 'Add Contact Person'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3.5 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-300">Contact Person Name</label>
              <Input
                placeholder="Enter contact person name"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={cn(fieldClass, contactErrors.name && 'border-red-400')}
              />
              {contactErrors.name ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">Designation</label>
              <Input
                placeholder="Enter designation"
                value={contactDesignation}
                onChange={(e) => {
                  setContactDesignation(e.target.value);
                  if (contactErrors.designation) {
                    setContactErrors((prev) => ({ ...prev, designation: '' }));
                  }
                }}
                className={cn(fieldClass, contactErrors.designation && 'border-red-400')}
              />
              {contactErrors.designation ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.designation}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">Department</label>
              <Input
                placeholder="Enter department"
                value={contactDepartment}
                onChange={(e) => {
                  setContactDepartment(e.target.value);
                  if (contactErrors.department) {
                    setContactErrors((prev) => ({ ...prev, department: '' }));
                  }
                }}
                className={cn(fieldClass, contactErrors.department && 'border-red-400')}
              />
              {contactErrors.department ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.department}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">Phone</label>
              <Input
                placeholder="Enter phone"
                value={contactPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d+()\-\s]/g, '');
                  setContactPhone(val);
                  if (contactErrors.phone) setContactErrors((prev) => ({ ...prev, phone: '' }));
                }}
                className={cn(fieldClass, contactErrors.phone && 'border-red-400')}
              />
              {contactErrors.phone ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.phone}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">Email</label>
              <Input
                placeholder="Enter email"
                value={contactEmail}
                onBlur={onEmailBlur}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={cn(fieldClass, contactErrors.email && 'border-red-400')}
              />
              {contactErrors.email ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-300">Address</label>
              <Input
                placeholder="Enter address"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">Country</label>
              <Combobox
                options={countries.map((c: any) => ({
                  label: c.countryName,
                  value: c.countryName,
                }))}
                value={contactCountry}
                onChange={onCountryChange}
                placeholder="Select country"
                className={cn(fieldClass, 'px-3', contactErrors.country && 'border-red-400')}
              />
              {contactErrors.country ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.country}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">State</label>
              <Combobox
                options={statesList.map((s: any) => ({
                  label: s.stateName,
                  value: s.stateName,
                }))}
                value={contactState}
                onChange={onStateChange}
                placeholder="Select state"
                className={cn(fieldClass, 'px-3', contactErrors.state && 'border-red-400')}
              />
              {contactErrors.state ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.state}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">City</label>
              <Combobox
                options={citiesList.map((ci: any) => ({
                  label: ci.cityName,
                  value: ci.cityName,
                }))}
                value={contactCity}
                onChange={(val) => {
                  setContactCity(val);
                  if (contactErrors.city) setContactErrors((prev) => ({ ...prev, city: '' }));
                }}
                placeholder="Select city"
                className={cn(fieldClass, 'px-3', contactErrors.city && 'border-red-400')}
              />
              {contactErrors.city ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.city}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-[11px] font-medium text-slate-300">PIN/Zip Code</label>
              <Input
                placeholder="Enter PIN/Zip Code"
                value={contactPinCode}
                maxLength={10}
                onChange={(e) => {
                  setContactPinCode(e.target.value);
                  if (contactErrors.pinCode) {
                    setContactErrors((prev) => ({ ...prev, pinCode: '' }));
                  }
                }}
                className={cn(fieldClass, contactErrors.pinCode && 'border-red-400')}
              />
              {contactErrors.pinCode ? (
                <p className="text-[10px] text-red-500 font-medium">{contactErrors.pinCode}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2 sm:max-w-xs">
              <label className="text-[11px] font-medium text-slate-300">Status</label>
              <Combobox
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                ]}
                value={contactStatus}
                onChange={(val) => setContactStatus(val)}
                placeholder="Select status"
                className={cn(fieldClass, 'px-3')}
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
            {editingIndex !== null ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
