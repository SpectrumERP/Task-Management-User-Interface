import { useState } from 'react';
import { MasterConfig, FormFieldConfig } from './types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/Combobox';
import { Textarea } from '@/components/ui/textarea';
import { MasterCreateDialog } from '../MasterCreateDialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';

interface DynamicFormProps {
  config: MasterConfig;
  data: any;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

export function DynamicForm({ config, data, onChange, errors = {} }: DynamicFormProps) {
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType, setActiveMasterType] = useState<'country' | 'state' | 'city' | 'category' | 'folder' | null>(null);

  const authCompanies = useAuthStore((state: any) => state.company);
  const companyNoVal = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues } = useTaskStore();

  const renderField = (field: FormFieldConfig) => {
    // Check if field should be disabled
    const isDisabled = field.disabledIf ? field.disabledIf(data) : false;

    // Custom render completely overrides standard render
    if (field.customRender) {
      return field.customRender(data, (val) => onChange(field.name, val), errors);
    }

    const hasError = !!errors[field.name];
    const value = data[field.name];

    const inputClasses = cn(
      "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
      hasError && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500",
      field.className
    );

    const comboboxClasses = cn(
      "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
      hasError && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500",
      field.className
    );

    let inputElement = null;

    switch (field.type) {
      case 'text':
        inputElement = (
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isDisabled}
            placeholder={isDisabled ? field.disabledPlaceholder : field.placeholder}
            className={inputClasses}
          />
        );
        break;
      case 'number':
        inputElement = (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value === '' ? null : Number(e.target.value))}
            disabled={isDisabled}
            placeholder={isDisabled ? field.disabledPlaceholder : field.placeholder}
            className={inputClasses}
          />
        );
        break;
      case 'textarea':
        inputElement = (
          <Textarea
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isDisabled}
            placeholder={isDisabled ? field.disabledPlaceholder : field.placeholder}
            className={cn(inputClasses, "h-auto min-h-[80px] py-3")}
          />
        );
        break;
      case 'checkbox':
        return (
          <div className={cn("flex items-center space-x-2 pt-6", field.colSpan ? `col-span-${field.colSpan}` : "")}>
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => onChange(field.name, checked)}
              disabled={isDisabled}
              className="border-slate-300 data-[state=checked]:bg-[#006699] data-[state=checked]:border-[#006699]"
            />
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
              {field.label}
            </label>
          </div>
        );
      case 'combobox':
      case 'select':
        inputElement = (
          <Combobox
            options={(field.options || []).map(opt => ({ label: opt.label, value: String(opt.value) }))}
            value={value ? String(value) : ''}
            onChange={(val) => onChange(field.name, val)}
            disabled={isDisabled}
            placeholder={isDisabled ? field.disabledPlaceholder : field.placeholder}
            className={comboboxClasses}
            onAddNew={
              field.onAddNewAction === 'openCreateModal' && field.onAddNewMasterType
                ? () => {
                    setActiveMasterType(field.onAddNewMasterType as any);
                    setIsMasterCreateOpen(true);
                  }
                : undefined
            }
          />
        );
        break;
      default:
        inputElement = <div>Unsupported field type</div>;
    }

    return (
      <div key={field.name} className={cn("space-y-0", field.colSpan ? `col-span-${field.colSpan}` : "")}>
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        {inputElement}
        {hasError && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors[field.name]}</p>}
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.formFields.map(renderField)}
      </div>

      <MasterCreateDialog
        open={isMasterCreateOpen}
        onOpenChange={(isOpen) => {
          setIsMasterCreateOpen(isOpen);
          if (!isOpen) setActiveMasterType(null);
        }}
        type={activeMasterType as any}
        companyNo={companyNoVal}
        fillValues={fillValues}
        onSuccess={() => {
          // In the future, this might need to trigger a re-fetch of fill values
          // Right now it relies on existing logic or the user has to refresh/click
        }}
      />
    </>
  );
}
