import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';


const fieldClass = FIELD_CONTROL_CLASS;

interface CompanyPrimaryContactSectionProps {
  contactName: string;
  setContactName: (val: string) => void;
  contactDesignation: string;
  setContactDesignation: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  contactErrors: Record<string, string>;
  setContactErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function CompanyPrimaryContactSection({
  contactName,
  setContactName,
  contactDesignation,
  setContactDesignation,
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  contactErrors,
  setContactErrors,
}: CompanyPrimaryContactSectionProps) {
  return (
    <div className="pt-6 mt-6 border-t border-[var(--tm-border)]/70">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5">
        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2 relative">
          <FieldLabel required>Contact Person Name</FieldLabel>
          <FieldControl error={contactErrors.name}>
            <Input
              placeholder="Enter contact person name"
              value={contactName}
              maxLength={100}
              onChange={(e) => {
                setContactName(e.target.value);
                if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: '' }));
              }}
              className={cn(fieldClass, contactErrors.name && 'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
          <FieldLabel>Designation</FieldLabel>
          <Input
            placeholder="Enter designation"
            value={contactDesignation}
            maxLength={100}
            onChange={(e) => setContactDesignation(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
          <FieldLabel required>Phone Number</FieldLabel>
          <FieldControl error={contactErrors.phone}>
            <Input
              placeholder="Enter phone number"
              value={contactPhone}
              maxLength={20}
              onChange={(e) => {
                setContactPhone(e.target.value);
                if (contactErrors.phone) setContactErrors((prev) => ({ ...prev, phone: '' }));
              }}
              className={cn(fieldClass, contactErrors.phone && 'border-red-400')}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
          <FieldLabel>Email Address</FieldLabel>
          <FieldControl error={contactErrors.email}>
            <Input
              type="email"
              placeholder="Enter email address"
              value={contactEmail}
              maxLength={100}
              onChange={(e) => {
                setContactEmail(e.target.value);
                if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: '' }));
              }}
              className={cn(fieldClass, contactErrors.email && 'border-red-400')}
            />
          </FieldControl>
        </div>
      </div>
    </div>
  );
}
