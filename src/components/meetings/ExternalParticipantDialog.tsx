import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import type { ParticipantValue } from '@/lib/meetingParticipants';
import { cn } from '@/lib/utils';

/** The details the meeting-notes API requires for an external participant. */
const externalSchema = z.object({
  participantName: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address').max(100),
  companyName: z.string().trim().min(1, 'Company Name is required').max(100),
  designation: z.string().trim().min(1, 'Designation is required').max(100),
  contactNo: z.string().trim().min(1, 'Contact No is required').max(20),
});

type ExternalDetails = z.infer<typeof externalSchema>;

const FIELDS: { name: keyof ExternalDetails; label: string; placeholder: string; maxLength: number; type?: string }[] = [
  { name: 'participantName', label: 'Name', placeholder: 'Full name', maxLength: 100 },
  { name: 'email', label: 'Email', placeholder: 'name@company.com', maxLength: 100, type: 'email' },
  { name: 'companyName', label: 'Company Name', placeholder: 'Company', maxLength: 100 },
  { name: 'designation', label: 'Designation', placeholder: 'Designation', maxLength: 100 },
  { name: 'contactNo', label: 'Contact No', placeholder: 'Contact number', maxLength: 20, type: 'tel' },
];

interface ExternalParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The external participant being completed / edited. */
  value: ParticipantValue | null;
  onSave: (details: ExternalDetails) => void;
}

/** Name, email, company, designation and contact number for an external meeting participant. */
export function ExternalParticipantDialog({ open, onOpenChange, value, onSave }: ExternalParticipantDialogProps) {
  const form = useForm<ExternalDetails>({
    resolver: zodResolver(externalSchema),
    defaultValues: { participantName: '', email: '', companyName: '', designation: '', contactNo: '' },
  });

  useEffect(() => {
    if (!open) return;
    const email = value?.email?.trim() || '';
    const name = value?.participantName?.trim() || '';
    form.reset({
      // The chip's name defaults to the email; don't prefill that as the person's name.
      participantName: name && name.toLowerCase() !== email.toLowerCase() ? name : '',
      email,
      companyName: value?.companyName || '',
      designation: value?.designation || '',
      contactNo: value?.contactNo || '',
    });
  }, [open, value, form]);

  const errors = form.formState.errors;
  const submit = form.handleSubmit((details) => {
    onSave(details);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[12px] border border-[var(--tm-border)]/80 p-0">
        <DialogHeader className="px-5 pt-5 pb-1">
          <DialogTitle className="text-base font-semibold text-slate-100">External participant</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Details for someone outside the user and employee lists.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-3 px-5 py-3 sm:grid-cols-2"
          onSubmit={(e) => {
            // Inside the meeting form: never submit it from here.
            e.preventDefault();
            e.stopPropagation();
            void submit();
          }}
        >
          {FIELDS.map((f, i) => (
            <div key={f.name} className={cn('space-y-1.5', (f.name === 'participantName' || f.name === 'email') && 'sm:col-span-2')}>
              <FieldLabel required>{f.label}</FieldLabel>
              <FieldControl error={errors[f.name]?.message}>
                <Input
                  {...form.register(f.name)}
                  type={f.type || 'text'}
                  autoFocus={i === 0}
                  maxLength={f.maxLength}
                  placeholder={f.placeholder}
                  className={cn('h-9 rounded-[8px] text-xs', errors[f.name] && 'border-red-400')}
                />
              </FieldControl>
            </div>
          ))}
          {/* Enter in any field saves */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
        <DialogFooter className="flex justify-end gap-2 rounded-b-[12px] border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] px-5 py-3">
          <Button type="button" variant="outline" className="h-9 rounded-[8px] text-xs border-[var(--tm-border)]" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button type="button" className="h-9 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold" onClick={() => void submit()}>
            Save details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
