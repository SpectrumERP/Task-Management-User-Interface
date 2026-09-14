import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

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
              <FieldLabel>Contact Person Name</FieldLabel>
              <FieldControl error={contactErrors.name}>
              <Input
                placeholder="Enter contact person name"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={cn(fieldClass, contactErrors.name && 'border-red-400')}
              />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Designation</FieldLabel>
              <FieldControl error={contactErrors.designation}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Department</FieldLabel>
              <FieldControl error={contactErrors.department}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Phone</FieldLabel>
              <FieldControl error={contactErrors.phone}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Email</FieldLabel>
              <FieldControl error={contactErrors.email}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel>Address</FieldLabel>
              <Input
                placeholder="Enter address"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Country</FieldLabel>
              <FieldControl error={contactErrors.country}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>State</FieldLabel>
              <FieldControl error={contactErrors.state}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>City</FieldLabel>
              <FieldControl error={contactErrors.city}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>PIN/Zip Code</FieldLabel>
              <FieldControl error={contactErrors.pinCode}>
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
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2 sm:max-w-xs">
              <FieldLabel>Status</FieldLabel>
              <Combobox
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                ]}
                value={contactStatus}
                onChange={(val) => setContactStatus(val)}
                placeholder="Select status"
                sortAlphabetically={false}
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
