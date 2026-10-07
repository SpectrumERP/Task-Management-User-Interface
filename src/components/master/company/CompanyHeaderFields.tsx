import { useEffect, useRef, useState } from 'react';
import { format, isValid } from 'date-fns';
import { apiService } from '@/services/apiService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { Building, Camera as CameraIcon, File, IdCard, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DATE_TIME_FORMAT } from '@/lib/dateTime';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { toast } from 'sonner';
import { ANALYZE_IMAGE_ACCEPT_ATTR, UPLOAD_ACCEPT_ATTR, validateAnalyzeImageFile } from '@/lib/allowedUploadFiles';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CompanyFormSection } from './CompanyFormSection';

const fieldClass = FIELD_CONTROL_CLASS;

type BusinessEntityTypeOption = {
  operCRMBusinessEntityTypeName?: string;
  operCRMBusinessEntityTypeNo?: string | number;
};




type BeSuggestion = {
  businessEntityName?: string;
  BusinessEntityName?: string;
  name?: string;
};

function suggestionLabel(be: BeSuggestion) {
  return be.businessEntityName || be.BusinessEntityName || be.name || '';
}

function RecordMetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-300 truncate">{children}</span>
    </div>
  );
}


interface CompanyHeaderFieldsProps {
  code: string;
  editingId: string | null;
  name: string;
  setName: (v: string) => void;
  companyType: string;
  setCompanyType: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  businessEntityTypes: BusinessEntityTypeOption[];
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOpenCamera: () => void;
  createdBy?: string | null;
  createdDate?: string | null;
  attachmentCount?: number;
  onShowAttachments?: () => void;
  onUploadAttachment?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDirectAnalyze?: (file: File) => void;
  children?: React.ReactNode;
}

export function CompanyHeaderFields({
  code,
  editingId,
  name,
  setName,
  companyType,
  setCompanyType,
  website,
  setWebsite,
  businessEntityTypes,
  errors,
  setErrors,
  onOpenCamera,
  createdBy,
  createdDate,
  attachmentCount = 0,
  onShowAttachments,
  onUploadAttachment,
  onDirectAnalyze,
  children,
}: CompanyHeaderFieldsProps) {
  const [beSuggestions, setBeSuggestions] = useState<BeSuggestion[]>([]);
  const [showBeSuggestions, setShowBeSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const beSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSearchSuggestions = name.trim().length >= 2;
  const visibleSuggestions = canSearchSuggestions ? beSuggestions : [];

  const createdDateObj = createdDate ? new Date(createdDate) : null;
  const formattedCreatedDate =
    createdDateObj && isValid(createdDateObj) ? format(createdDateObj, DATE_TIME_FORMAT) : null;



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
      title="Business Entity"
      description="Required details, primary contact and address"
      action={
        <div className="flex items-center gap-3">
          {errors.attachments ? (
            <span role="alert" className="text-[10px] font-medium text-red-500">
              {errors.attachments}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={onShowAttachments}
            className={cn(
              'h-8 px-3 rounded-[8px] text-xs font-semibold text-slate-500 border-slate-300 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1.5 shadow-none',
              errors.attachments && 'text-red-500 border-red-400'
            )}
            title="View Attachments"
          >
            <File size={14} />
            {attachmentCount}
          </Button>

          <div className="relative">
            <input
              type="file"
              accept={UPLOAD_ACCEPT_ATTR}
              onChange={onUploadAttachment}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Upload Attachment"
            />
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-8 w-8 p-0 rounded-[8px] text-xs font-semibold text-[#0EA5E9] border-[#0EA5E9]/30 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1.5 shadow-none',
                errors.attachments && 'text-red-500 border-red-400'
              )}
              title="Upload Attachment"
            >
              <Paperclip size={14} />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0 rounded-[8px] text-xs font-semibold text-[#0EA5E9] border-[#0EA5E9]/30 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1.5 shadow-none"
                title="Analyze Image"
              >
                <IdCard size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--tm-surface)] border-[var(--tm-border)] shadow-md text-slate-700 dark:text-slate-300">
              <DropdownMenuItem className="cursor-pointer hover:bg-[var(--tm-elevated)]" onSelect={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = ANALYZE_IMAGE_ACCEPT_ATTR;
                input.onchange = (ev: any) => {
                  const file = ev.target.files?.[0];
                  if (!file) return;
                  const check = validateAnalyzeImageFile(file);
                  if (!check.ok) {
                    toast.error(check.reason);
                    return;
                  }
                  if (onDirectAnalyze) {
                    onDirectAnalyze(file);
                  }
                };
                input.click();
              }}>
                <File className="mr-2 h-4 w-4" />
                <span>Direct Analyze</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-[var(--tm-elevated)]" onSelect={() => {
                setTimeout(() => onOpenCamera?.(), 150);
              }}>
                <CameraIcon className="mr-2 h-4 w-4" />
                <span>Camera Capture</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      {editingId && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 pb-3 mb-3.5 border-b border-[var(--tm-border)]">
          <RecordMetaItem label="Code">
            <span className="font-mono">{code || '—'}</span>
          </RecordMetaItem>
          {createdBy && <RecordMetaItem label="Created by">{createdBy}</RecordMetaItem>}
          {formattedCreatedDate && <RecordMetaItem label="Created on">{formattedCreatedDate}</RecordMetaItem>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3.5">

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
      </div>
      {children}
      <div className="space-y-1.5 min-w-0 mt-3.5">
        <FieldLabel htmlFor="businessEntityWebsite">Website</FieldLabel>
        <FieldControl error={errors.website}>
          <Input
            id="businessEntityWebsite"
            inputMode="url"
            placeholder="https://www.example.com"
            value={website}
            maxLength={2000}
            onChange={(e) => {
              setWebsite(e.target.value);
              if (errors.website) setErrors((prev) => ({ ...prev, website: '' }));
            }}
            className={cn(fieldClass, errors.website && 'border-red-400')}
          />
        </FieldControl>
      </div>
    </CompanyFormSection>
  );
}
