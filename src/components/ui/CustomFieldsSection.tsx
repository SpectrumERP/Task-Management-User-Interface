import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { Combobox } from '@/components/ui/Combobox';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Loader2, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// -------------------------------------------------------------
// Helper AutoComplete Async Selector Component (fieldTypeNo: 8)
// -------------------------------------------------------------
interface AsyncAutoCompleteProps {
  customFieldNo: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function AsyncAutoCompleteList({
  customFieldNo,
  value,
  onChange,
  placeholder = "Search...",
  className
}: AsyncAutoCompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  // Search when typing or opening
  useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.get<any>(
          `/api/master/custom-fields/get-source-forms-detail`,
          {
            params: {
              customFieldNo,
              keywordSearch: search
            }
          }
        );
        if (active && response) {
          const data = Array.isArray(response) ? response : (response.data || []);
          setOptions(data);
        }
      } catch (err) {
        console.error("Failed to fetch autocomplete list data:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (search === "") {
      fetchData();
    } else {
      const timer = setTimeout(fetchData, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open, customFieldNo]);

  // Resolve selected item's primary value when value changes
  useEffect(() => {
    if (value) {
      const matched = options.find((opt) => opt.id?.toString() === value?.toString());
      if (matched) {
        setSelectedLabel(matched.primaryValue || "");
      } else {
        const resolveItem = async () => {
          try {
            const response = await apiService.get<any>(
              `/api/master/custom-fields/get-source-forms-detail`,
              {
                params: {
                  customFieldNo,
                  keywordSearch: ""
                }
              }
            );
            if (response) {
              const data = Array.isArray(response) ? response : (response.data || []);
              const item = data.find((opt: any) => opt.id?.toString() === value?.toString());
              if (item) {
                setSelectedLabel(item.primaryValue || "");
              } else {
                setSelectedLabel(value);
              }
            }
          } catch (err) {
            console.error("Failed to resolve autocomplete label:", err);
            setSelectedLabel(value);
          }
        };
        resolveItem();
      }
    } else {
      setSelectedLabel("");
    }
  }, [value, customFieldNo]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between transition-all border shadow-sm relative pr-8 bg-transparent text-[11px] font-bold text-slate-700 hover:bg-slate-50/50 rounded-lg h-7 px-2",
            className
          )}
        >
          <span className={cn("truncate pr-2", !selectedLabel && "text-slate-400 font-medium")}>
            {selectedLabel || placeholder}
          </span>
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {value && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setSelectedLabel("");
                }}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-[9999]" align="start">
        <Command className="rounded-xl border-slate-200" shouldFilter={false}>
          <div className="border-b border-slate-100 bg-slate-50/50">
            <CommandInput
              placeholder="Search..."
              className="h-8 border-none focus:ring-0 bg-transparent text-[11px]"
              onValueChange={setSearch}
            />
          </div>
          <CommandList className="max-h-52 scrollbar-thin">
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Searching...</span>
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty className="py-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
                No items found
              </CommandEmpty>
            )}
            {!isLoading && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={`${opt.primaryValue} ${opt.secondaryValue}`}
                    onSelect={() => {
                      onChange(opt.id.toString());
                      setSelectedLabel(opt.primaryValue);
                      setOpen(false);
                    }}
                    className="text-[11px] font-bold py-1.5 px-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-start gap-0.5"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-slate-800 font-bold">{opt.primaryValue}</span>
                      {value?.toString() === opt.id?.toString() && (
                        <Check className="h-3 w-3 text-[#006699] shrink-0" />
                      )}
                    </div>
                    {opt.secondaryValue && (
                      <span className="text-[9px] text-slate-400 font-normal">{opt.secondaryValue}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// -------------------------------------------------------------
// Main Reusable Custom Fields Section Component
// -------------------------------------------------------------
interface CustomFieldsSectionProps {
  customFields: Array<{ customFieldNo: string; fieldValue: string }>;
  onChange: (fields: Array<{ customFieldNo: string; fieldValue: string }>) => void;
  categoryFillValues?: any;
  companyNo?: number;
  hideAddButton?: boolean;
}

export function CustomFieldsSection({
  customFields,
  onChange,
  categoryFillValues: categoryFillValuesProp,
  companyNo = 2,
  hideAddButton = false
}: CustomFieldsSectionProps) {
  const [internalFillValues, setInternalFillValues] = useState<any>(null);

  // If no fill values prop is passed, fetch them asynchronously internally
  useEffect(() => {
    if (categoryFillValuesProp) {
      setInternalFillValues(categoryFillValuesProp);
      return;
    }

    const fetchFillValues = async () => {
      try {
        const response = await apiService.get<any>(`/api/master/task-categories/fill-values?companyNo=${companyNo}`);
        if (response) {
          setInternalFillValues(response.data || response);
        }
      } catch (err) {
        console.error("Failed to fetch category fill-values inside CustomFieldsSection:", err);
      }
    };
    fetchFillValues();
  }, [categoryFillValuesProp, companyNo]);

  const fillValues = categoryFillValuesProp || internalFillValues;

  const addField = () => {
    onChange([...customFields, { customFieldNo: '', fieldValue: '' }]);
  };

  const removeField = (index: number) => {
    onChange(customFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, val: string) => {
    const nextFields = customFields.map((cf, i) => {
      if (i === index) {
        if (key === 'customFieldNo') {
          return { ...cf, customFieldNo: val, fieldValue: '' }; // reset value on field name change
        }
        return { ...cf, [key]: val };
      }
      return cf;
    });
    onChange(nextFields);
  };

  const renderValueField = (cf: any, index: number) => {
    if (!cf.customFieldNo) {
      return (
        <Input
          disabled
          placeholder="Select custom field..."
          className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 w-full cursor-not-allowed text-slate-400 font-medium"
        />
      );
    }

    const selectedField = (fillValues?.customFields || []).find(
      (field: any) => (field.customFieldNo || '').toString() === cf.customFieldNo
    );

    const dataTypeNo = selectedField?.fieldTypeNo;

    switch (dataTypeNo) {
      case 1: // Numeric
        return (
          <Input
            type="number"
            placeholder="Enter numeric..."
            value={cf.fieldValue}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      case 2: // Float
        return (
          <Input
            type="number"
            step="any"
            placeholder="Enter decimal..."
            value={cf.fieldValue}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      case 3: // Alpha Numeric
        return (
          <Input
            type="text"
            placeholder="Enter text..."
            value={cf.fieldValue}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      case 4: // Yes/No dropdown
        return (
          <Combobox
            options={[
              { label: "Yes", value: "Yes" },
              { label: "No", value: "No" }
            ]}
            value={cf.fieldValue}
            onChange={(val) => updateField(index, 'fieldValue', val)}
            placeholder="Select..."
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      case 5: // Boolean Checkbox
        return (
          <div className="flex items-center h-7 pl-2">
            <Checkbox
              id={`reusable-cf-bool-${index}`}
              checked={cf.fieldValue === 'true' || cf.fieldValue === true}
              onCheckedChange={(checked) => updateField(index, 'fieldValue', checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-slate-300"
            />
          </div>
        );
      case 6: // Date Picker
        return (
          <input
            type="date"
            value={cf.fieldValue || ''}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className="h-7 rounded-lg border border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent outline-none shadow-none px-2 w-full transition-colors text-slate-700 font-bold"
          />
        );
      case 7: { // Local Dropdown choices
        const options = Array.isArray(selectedField?.fieldData)
          ? selectedField.fieldData.map((opt: string) => ({
            label: opt,
            value: opt
          }))
          : [];
        return (
          <Combobox
            options={options}
            value={cf.fieldValue}
            onChange={(val) => updateField(index, 'fieldValue', val)}
            placeholder="Select..."
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      }
      case 8: // Async Auto-complete list
        return (
          <AsyncAutoCompleteList
            customFieldNo={cf.customFieldNo}
            value={cf.fieldValue}
            onChange={(val) => updateField(index, 'fieldValue', val)}
            placeholder="Search..."
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
      default:
        return (
          <Input
            placeholder="Enter value..."
            value={cf.fieldValue}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
          />
        );
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1"> Addition Fields </label>
        {!hideAddButton && (
          <Button
            type="button"
            onClick={addField}
            variant="ghost"
            size="sm"
            className="h-7 text-[9px] font-bold text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1"
          >
            <Plus size={12} className="text-[#006699]" /> Add Additional Field
          </Button>
        )}
      </div>

      {customFields.length > 0 ? (
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
          <div className="max-h-[250px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm border-b border-slate-200 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr>
                  <th className="px-3 py-2 font-black text-slate-700 uppercase tracking-wider w-1/2">Field Name</th>
                  <th className="px-3 py-2 font-black text-slate-700 uppercase tracking-wider w-1/2">Value</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customFields.map((cf, index) => (
                  <tr key={index} className="group hover:bg-white transition-colors">
                    <td className="px-2 py-1">
                      <Combobox
                        options={(fillValues?.customFields || []).map((field: any) => ({
                          label: field.customFieldName || '',
                          value: (field.customFieldNo || '').toString()
                        }))}
                        value={cf.customFieldNo}
                        onChange={(val) => updateField(index, 'customFieldNo', val)}
                        placeholder="Select custom field..."
                        className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2 w-full transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1">
                      {renderValueField(cf, index)}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No additional fields added yet</span>
        </div>
      )}
    </div>
  );
}
