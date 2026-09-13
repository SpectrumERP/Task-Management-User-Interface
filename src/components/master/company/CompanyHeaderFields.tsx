import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiService } from '@/services/apiService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { Building, Camera as CameraIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import {
  buildTimeZoneComboboxOptions,
  formatTimeZoneDisplay,
  type TimeZoneOptionLike,
} from '@/lib/windowsTimeZones';
import { CompanyFormSection } from './CompanyFormSection';

const fieldClass = FIELD_CONTROL_CLASS;

type BusinessEntityTypeOption = {
  operCRMBusinessEntityTypeName?: string;
  operCRMBusinessEntityTypeNo?: string | number;
};

type TimeZoneOption = TimeZoneOptionLike;

type BeSuggestion = {
  businessEntityName?: string;
  BusinessEntityName?: string;
  name?: string;
};

function suggestionLabel(be: BeSuggestion) {
  return be.businessEntityName || be.BusinessEntityName || be.name || '';
}

function FieldErrorTip({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
    >
      {message}
    </span>
  );
}

function FieldControl({
  children,
  error,
  className,
}: {
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-300"
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

interface CompanyHeaderFieldsProps {
  code: string;
  editingId: string | null;
  name: string;
  setName: (v: string) => void;
  aliasName: string;
  setAliasName: (v: string) => void;
  companyType: string;
  setCompanyType: (v: string) => void;
  companyTimeZoneNo: string;
  setCompanyTimeZoneNo: (v: string) => void;
  /** Loaded timezone id/name for edit mode until fill-values resolve. */
  selectedTimeZoneName?: string;
  setSelectedTimeZoneName?: (v: string) => void;
  creditLimit: number | null;
  setCreditLimit: (v: number | null) => void;
  creditInsuranceCompanyName: string;
  setCreditInsuranceCompanyName: (v: string) => void;
  companyVatGst: string;
  setCompanyVatGst: (v: string) => void;
  businessEntityTypes: BusinessEntityTypeOption[];
  timeZones: TimeZoneOption[];
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOpenCamera: () => void;
}

export function CompanyHeaderFields({
  code,
  editingId,
  name,
  setName,
  aliasName,
  setAliasName,
  companyType,
  setCompanyType,
  companyTimeZoneNo,
  setCompanyTimeZoneNo,
  selectedTimeZoneName,
  setSelectedTimeZoneName,
  creditLimit,
  setCreditLimit,
  creditInsuranceCompanyName,
  setCreditInsuranceCompanyName,
  companyVatGst,
  setCompanyVatGst,
  businessEntityTypes,
  timeZones,
  errors,
  setErrors,
  onOpenCamera,
}: CompanyHeaderFieldsProps) {
  const [beSuggestions, setBeSuggestions] = useState<BeSuggestion[]>([]);
  const [showBeSuggestions, setShowBeSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const beSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSearchSuggestions = name.trim().length >= 2;
  const visibleSuggestions = canSearchSuggestions ? beSuggestions : [];

  const timeZoneOptions = useMemo(() => {
    const opts = buildTimeZoneComboboxOptions(timeZones);
    if (
      companyTimeZoneNo &&
      !opts.some((o) => o.value === companyTimeZoneNo) &&
      selectedTimeZoneName
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

  useEffect(() => {
    if (!canSearchSuggestions) {
      return;
    }

    if (beSearchTimeout.current) {
      clearTimeout(beSearchTimeout.current);
    }

    beSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiService.get<{ data?: BeSuggestion[] } | BeSuggestion[]>(
          `/api/master/business-entities?BusinessEntityName=${encodeURIComponent(name)}`
        );
        if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
          setBeSuggestions(res.data);
          setHighlightedIndex(-1);
        } else if (Array.isArray(res)) {
          setBeSuggestions(res);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => {
      if (beSearchTimeout.current) clearTimeout(beSearchTimeout.current);
    };
  }, [name, canSearchSuggestions]);

  return (
    <CompanyFormSection
      icon={Building}
      title="General Business Entity Information"
      description="Code, name, type, timezone and tax details"
      action={
        <Button
          type="button"
          variant="outline"
          onClick={onOpenCamera}
          className="h-8 px-3 rounded-[8px] text-xs font-semibold text-[#0EA5E9] border-[#0EA5E9]/30 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1.5 shadow-none"
        >
          <CameraIcon size={14} />
          Capture Attachment
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3.5">
        <div className="space-y-1.5 min-w-0">
          <FieldLabel>Code</FieldLabel>
          <Input
            readOnly
            tabIndex={-1}
            value={editingId ? code || '—' : 'AUTO-GEN-CODE'}
            className={cn(
              fieldClass,
              'bg-[var(--tm-elevated)] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-[var(--tm-border)]/80'
            )}
          />
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2 relative">
          <FieldLabel htmlFor="businessEntityName" required>
            Business Entity Name
          </FieldLabel>
          <FieldControl error={errors.name}>
            <Input
              id="businessEntityName"
              placeholder="Enter Business Entity Name"
              value={name}
              maxLength={100}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (next.trim().length < 2) {
                  setBeSuggestions([]);
                  setShowBeSuggestions(false);
                  setHighlightedIndex(-1);
                } else {
                  setShowBeSuggestions(true);
                }
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              onFocus={() => {
                if (name.trim().length >= 2) setShowBeSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowBeSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (!showBeSuggestions || visibleSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex((prev) =>
                    prev < visibleSuggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                } else if (e.key === 'Enter') {
                  if (highlightedIndex >= 0 && highlightedIndex < visibleSuggestions.length) {
                    e.preventDefault();
                    const be = visibleSuggestions[highlightedIndex];
                    setName(suggestionLabel(be));
                    setShowBeSuggestions(false);
                  }
                }
              }}
              className={cn(
                fieldClass,
                errors.name &&
                'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
              )}
            />
            {showBeSuggestions && visibleSuggestions.length > 0 ? (
              <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-[var(--tm-surface)] rounded-[8px] border border-[var(--tm-border)] shadow-lg max-h-48 overflow-auto">
                {visibleSuggestions.map((be, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'px-3 py-2 text-xs cursor-pointer text-slate-200',
                      idx === highlightedIndex ? 'bg-[var(--tm-elevated)]' : 'hover:bg-[var(--tm-elevated)]'
                    )}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setName(suggestionLabel(be));
                      setShowBeSuggestions(false);
                    }}
                  >
                    {suggestionLabel(be)}
                  </div>
                ))}
              </div>
            ) : null}
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel htmlFor="businessEntityAlias">Alias</FieldLabel>
          <FieldControl>
            <Input
              id="businessEntityAlias"
              placeholder="Alternate / short name"
              value={aliasName}
              maxLength={100}
              onChange={(e) => setAliasName(e.target.value)}
              className={fieldClass}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel required>Business Entity Type</FieldLabel>
          <FieldControl error={errors.companyType}>
            <Combobox
              options={businessEntityTypes.map((t) => ({
                label: t.operCRMBusinessEntityTypeName || '',
                value: String(t.operCRMBusinessEntityTypeNo ?? ''),
              }))}
              value={companyType}
              onChange={(val) => {
                setCompanyType(val);
                if (errors.companyType) setErrors((prev) => ({ ...prev, companyType: '' }));
              }}
              placeholder="Select business entity type"
              className={cn(
                fieldClass,
                'px-3',
                errors.companyType &&
                'border-red-400 focus:ring-red-500/10 focus-visible:border-red-400'
              )}
            />
          </FieldControl>
        </div>

        <div className="space-y-1.5 min-w-0">
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
            className={cn(fieldClass, 'px-3 min-w-0')}
            contentClassName="min-w-[min(100vw-2rem,28rem)] w-[var(--radix-popover-trigger-width)]"
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel htmlFor="creditLimit">Credit Insurance Limit</FieldLabel>
          <Input
            id="creditLimit"
            type="number"
            placeholder="Enter credit insurance limit"
            value={creditLimit ?? ''}
            onChange={(e) => setCreditLimit(e.target.value === '' ? null : Number(e.target.value))}
            className={cn(
              fieldClass,
              'text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <FieldLabel htmlFor="creditInsuranceCompany">Credit Insurance Company Name</FieldLabel>
          <Input
            id="creditInsuranceCompany"
            placeholder="Enter credit insurance company name"
            value={creditInsuranceCompanyName}
            maxLength={100}
            onChange={(e) => setCreditInsuranceCompanyName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-1">
          <FieldLabel htmlFor="vatGst">VAT / GST No</FieldLabel>
          <Input
            id="vatGst"
            placeholder="Enter VAT No. / GST No."
            value={companyVatGst}
            maxLength={30}
            onChange={(e) => setCompanyVatGst(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
    </CompanyFormSection>
  );
}
