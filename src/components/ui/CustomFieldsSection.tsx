import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { Combobox } from '@/components/ui/Combobox';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Loader2, Check, ChevronsUpDown, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortByLabel } from '@/lib/sortOptions';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { useConfirmDelete } from '@/components/master/shared/useConfirmDelete';

// -------------------------------------------------------------
// Helper AutoComplete Async Selector Component (fieldTypeNo: 8)
// -------------------------------------------------------------
interface AsyncAutoCompleteProps {
  customFieldNo: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  displayColumn?: string;
  cascadedColumn?: string;
}

export function AsyncAutoCompleteList({
  customFieldNo,
  value,
  onChange,
  placeholder = "Search...",
  className,
  displayColumn,
  cascadedColumn
}: AsyncAutoCompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedObject, setSelectedObject] = useState<any>(null);

  const parsedCols = displayColumn ? displayColumn.split(',').map(c => c.trim()).filter(Boolean) : [];
  const renderCols = parsedCols.length > 0 ? parsedCols : (options.length > 0 ? Object.keys(options[0]).filter(k => k !== 'id' && k !== 'primaryValue' && k !== 'secondaryValue') : []);

  const getDynamicCols = (opt: any) => {
    if (parsedCols.length > 0) return parsedCols;
    if (opt) return Object.keys(opt).filter(k => k !== 'id' && k !== 'primaryValue' && k !== 'secondaryValue');
    return [];
  };

  const getOptionLabel = (opt: any) => {
    const c = getDynamicCols(opt);
    if (c.length > 0) {
      return c.map(k => opt[k]).filter(Boolean).join(' - ');
    }
    return opt.primaryValue || "";
  };

  const getTriggerLabel = (opt: any) => {
    if (opt['DocumentNoYearly']) return opt['DocumentNoYearly'];
    const c = getDynamicCols(opt);
    if (c.length > 1) return opt[c[1]];
    if (c.length > 0) return opt[c[0]];
    return opt.primaryValue || "";
  };

  const getOptionValue = (opt: any) => {
    if (opt.id !== undefined && opt.id !== null) return opt.id.toString();
    const c = getDynamicCols(opt);
    if (c.length > 0 && opt[c[0]] !== undefined && opt[c[0]] !== null) return opt[c[0]].toString();
    return "";
  };

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
      const matched = options.find((opt) => getOptionValue(opt) === value?.toString());
      if (matched) {
        setSelectedLabel(getTriggerLabel(matched));
        setSelectedObject(matched);
      } else {
        const resolveItem = async () => {
          try {
            const response = await apiService.get<any>(
              `/api/master/custom-fields/get-source-forms-detail`,
              {
                params: {
                  customFieldNo,
                  keywordSearch: "",
                  uniqueIds: value || ""
                }
              }
            );
            if (response) {
              const data = Array.isArray(response) ? response : (response.data || []);
              const item = data.find((opt: any) => getOptionValue(opt) === value?.toString());
              if (item) {
                setSelectedLabel(getTriggerLabel(item));
                setSelectedObject(item);
              } else {
                setSelectedLabel(value);
                setSelectedObject(null);
              }
            }
          } catch (err) {
            console.error("Failed to resolve autocomplete label:", err);
            setSelectedLabel(value);
            setSelectedObject(null);
          }
        };
        resolveItem();
      }
    } else {
      setSelectedLabel("");
      setSelectedObject(null);
    }
  }, [value, customFieldNo]);

  return (
    <div className="w-full flex flex-wrap items-center gap-1.5">
      <div className="flex-1 min-w-[150px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between transition-all border shadow-sm relative pr-8 bg-transparent text-[11px] font-medium text-slate-200 hover:bg-[var(--tm-muted)]/50 h-7 px-2",
                className,
                "rounded-[8px] border-[var(--tm-border)]"
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
                    className="p-0.5 rounded-full hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40 text-slate-400" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("p-0 z-[9999] max-w-[95vw]", renderCols.length > 4 ? "w-[600px]" : renderCols.length > 2 ? "w-[450px]" : "w-[280px]")} align="start">
            <Command className="rounded-xl border-[var(--tm-border)]" shouldFilter={false}>
              <div className="border-b border-[var(--tm-border)] bg-[var(--tm-muted)]/50">
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
                    <span className="text-[10px] font-medium  ">Searching...</span>
                  </div>
                )}
                {!isLoading && options.length === 0 && (
                  <CommandEmpty className="py-6 text-center text-[10px] text-slate-400 font-medium normal-case">
                    No items found
                  </CommandEmpty>
                )}
                {!isLoading && (
                  <CommandGroup>
                    {renderCols.length > 0 && options.length > 0 && (
                      <div className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-bold text-slate-500 bg-[var(--tm-muted)]/80 border-b border-[var(--tm-border)] uppercase tracking-wider">
                        <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${renderCols.length}, minmax(0, 1fr))` }}>
                          {renderCols.map((col, idx) => (
                            <span key={idx} className="truncate pr-1 border-r last:border-r-0 border-[#3D4F66]">
                              {col}
                            </span>
                          ))}
                        </div>
                        <div className="w-3 shrink-0" />
                      </div>
                    )}
                    {sortByLabel(options, {
                      getLabel: (opt) => getOptionLabel(opt),
                      getValue: (opt) => String(getOptionValue(opt) ?? ''),
                    }).map((opt, i) => {
                      const optLabel = getOptionLabel(opt);
                      const optValue = getOptionValue(opt);
                      const itemCols = getDynamicCols(opt);
                      return (
                        <CommandItem
                          key={optValue || i}
                          value={optLabel}
                          onSelect={() => {
                            onChange(optValue);
                            setSelectedLabel(getTriggerLabel(opt));
                            setSelectedObject(opt);
                            setOpen(false);
                          }}
                          className="text-[11px] font-medium py-2 px-2.5 cursor-pointer hover:bg-[var(--tm-muted)] transition-colors flex flex-col items-start gap-0.5 border-b border-slate-50 last:border-0"
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            {itemCols.length > 0 ? (
                              <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${itemCols.length}, minmax(0, 1fr))` }}>
                                {itemCols.map((col, idx) => (
                                  <span key={idx} className="text-slate-100 font-medium truncate pr-1 border-r last:border-r-0 border-[var(--tm-border)]">
                                    {opt[col] || '-'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-100 font-medium">{optLabel}</span>
                            )}

                            {value?.toString() === optValue ? (
                              <Check className="h-3 w-3 text-[#0EA5E9] shrink-0" />
                            ) : (
                              <div className="w-3 shrink-0" />
                            )}
                          </div>
                          {opt.secondaryValue && itemCols.length === 0 && (
                            <span className="text-[9px] text-slate-400 font-normal">{opt.secondaryValue}</span>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {cascadedColumn && selectedObject && (
        <div className="flex items-center gap-2 shrink-0">
          {cascadedColumn.split(',').map(c => c.trim()).filter(Boolean).map(col => {
            if (selectedObject[col] === undefined || selectedObject[col] === null) return null;
            return (
              <div key={col} className="text-[10px] text-slate-300 bg-[var(--tm-muted)] border border-[var(--tm-border)] rounded-md px-2 py-1 flex items-center gap-1.5 shadow-sm whitespace-nowrap h-7">
                <span className="font-semibold text-slate-100">{col}:</span>
                <span className="text-slate-500">{selectedObject[col]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  viewMode?: 'table' | 'grid';
  hideLabel?: boolean;
}

export function CustomFieldsSection({
  customFields,
  onChange,
  categoryFillValues: categoryFillValuesProp,
  companyNo = 1,
  hideAddButton = false,
  viewMode = 'table',
  hideLabel = false
}: CustomFieldsSectionProps) {
  const [internalFillValues, setInternalFillValues] = useState<any>(null);
  const deleteConfirm = useConfirmDelete('custom field');

  // Parent owns data when prop is passed (even null while loading) — do not double-fetch.
  // Self-fetch only when the prop is omitted (e.g. TaskForm).
  useEffect(() => {
    if (categoryFillValuesProp !== undefined) {
      setInternalFillValues(categoryFillValuesProp);
      return;
    }

    let cancelled = false;
    const fetchFillValues = async () => {
      try {
        const response = await apiService.get<any>(`/api/master/task-categories/fill-values?companyNo=${companyNo}`);
        if (!cancelled && response) {
          setInternalFillValues(response.data || response);
        }
      } catch (err) {
        console.error("Failed to fetch category fill-values inside CustomFieldsSection:", err);
      }
    };
    fetchFillValues();
    return () => {
      cancelled = true;
    };
  }, [categoryFillValuesProp, companyNo]);

  const fillValues = categoryFillValuesProp ?? internalFillValues;

  const addField = () => {
    onChange([...customFields, { customFieldNo: '', fieldValue: '' }]);
  };

  const removeField = (index: number) => {
    onChange(customFields.filter((_, i) => i !== index));
  };

  const requestRemoveField = (index: number) => {
    const cf = customFields[index];
    const defs = (fillValues?.customFields || fillValues?.data?.customFields || []) as any[];
    const def = defs.find(
      (d: any) => String(d.customFieldNo ?? d.id ?? '') === String(cf?.customFieldNo ?? '')
    );
    const label =
      def?.customFieldName ||
      def?.fieldName ||
      def?.name ||
      cf?.fieldValue ||
      'Custom field';
    deleteConfirm.requestConfirm({
      entityLabel: 'custom field',
      recordName: String(label),
      onConfirm: () => removeField(index),
    });
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
    const baseClasses = viewMode === 'grid'
      ? "h-10 rounded-[8px] border border-[var(--tm-border)] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/15 focus-visible:border-[#0EA5E9] text-xs bg-[var(--tm-surface)] shadow-tm-control px-3 w-full transition-all text-slate-100 font-medium"
      : "h-9 rounded-[8px] border border-[var(--tm-border)] group-hover:border-[#0EA5E9]/25 focus-visible:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/15 text-xs bg-[var(--tm-surface)] shadow-tm-control px-2.5 w-full transition-colors";

    if (!cf.customFieldNo) {
      return (
        <Input disabled placeholder="Select custom field..." className={cn(baseClasses, "cursor-not-allowed text-slate-400 bg-[var(--tm-elevated)]")} />
      );
    }

    const selectedField = (fillValues?.customFields || []).find(
      (field: any) => (field.customFieldNo || '').toString() === cf.customFieldNo
    );

    const dataTypeNo = selectedField?.fieldTypeNo;

    switch (dataTypeNo) {
      case 1: // Numeric
        return (
          <Input type="number" placeholder="Enter numeric..." value={cf.fieldValue} onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className={baseClasses}
          />
        );
      case 2: // Float
        return (
          <Input type="number" step="any" placeholder="Enter decimal..." value={cf.fieldValue} onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className={baseClasses}
          />
        );
      case 3: // Alpha Numeric
        return (
          <Input type="text" placeholder="Enter text..." value={cf.fieldValue} onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className={baseClasses}
          />
        );
      case 4: // Yes/No dropdown
        return (
          <Combobox options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} value={cf.fieldValue} onChange={(val) => updateField(index, 'fieldValue', val)}
            sortAlphabetically={false}
            placeholder="Select..."
            className={baseClasses}
          />
        );
      case 5: // Boolean Checkbox
        return (
          <div className={cn("flex items-center", viewMode === 'grid' ? "h-10 pl-1" : "h-9 pl-1")}>
            <Checkbox
              id={`reusable-cf-bool-${index}`}
              checked={cf.fieldValue === 'true' || cf.fieldValue === true}
              onCheckedChange={(checked) => updateField(index, 'fieldValue', checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-[#3D4F66]"
            />
          </div>
        );
      case 6: // Date Picker
        return (
          <input
            type="date"
            value={cf.fieldValue || ''}
            onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className={cn(baseClasses, "outline-none text-slate-200")}
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
          <Combobox options={options} value={cf.fieldValue} onChange={(val) => updateField(index, 'fieldValue', val)}
            placeholder="Select..."
            className={baseClasses}
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
            className={baseClasses}
            displayColumn={selectedField?.displayColumn || (cf as any).displayColumn}
            cascadedColumn={selectedField?.cascadedColumn || (cf as any).cascadedColumn}
          />
        );
      default:
        return (
          <Input placeholder="Enter value..." value={cf.fieldValue} onChange={(e) => updateField(index, 'fieldValue', e.target.value)}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <section className={cn(
      !hideLabel && "rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden"
    )}>
      {!hideLabel ? (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Sparkles size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Additional Fields</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              Optional custom fields for this record
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {customFields.length > 0 ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] px-2 text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                {customFields.length}
              </span>
            ) : null}
            {!hideAddButton ? (
              <Button
                type="button"
                onClick={addField}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-[8px] text-[11px] font-semibold text-[#0EA5E9] border-[#0EA5E9]/25 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1 shadow-none"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Field
              </Button>
            ) : null}
          </div>
        </div>
      ) : !hideAddButton ? (
        <div className="flex justify-end mb-2">
          <Button
            type="button"
            onClick={addField}
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-[8px] text-[11px] font-semibold text-[#0EA5E9] border-[#0EA5E9]/25 bg-[var(--tm-surface)] hover:bg-[var(--tm-tint)] gap-1 shadow-none"
          >
            <Plus size={13} strokeWidth={2.5} />
            Add Field
          </Button>
        </div>
      ) : null}

      <div className={cn(!hideLabel && "p-3 sm:p-4")}>
        {customFields.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {customFields.map((cf, index) => {
                const selectedField = (fillValues?.customFields || []).find(
                  (field: any) => (field.customFieldNo || '').toString() === cf.customFieldNo
                );

                return (
                  <div key={index} className="space-y-1.5 relative group rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-3">
                    {!hideAddButton ? (
                      <button
                        type="button"
                        onClick={() => requestRemoveField(index)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-[6px] z-10 hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                    {hideAddButton || cf.customFieldNo ? (
                      <label className="text-slate-300 font-medium text-[11px] block truncate pr-6">
                        {selectedField ? selectedField.customFieldName : 'Unknown Field'}
                      </label>
                    ) : (
                      <Combobox options={(fillValues?.customFields || []).map((field: any) => ({
                        label: field.customFieldName || '',
                        value: (field.customFieldNo || '').toString()
                      }))}
                        value={cf.customFieldNo}
                        onChange={(val) => updateField(index, 'customFieldNo', val)}
                        placeholder="Select custom field..."
                        className="h-9 mb-1 rounded-[8px] border border-[var(--tm-border)] text-xs bg-[var(--tm-surface)] shadow-tm-control w-full"
                      />
                    )}
                    {renderValueField(cf, index)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
              {customFields.map((cf, index) => (
                <div
                  key={index}
                  className="group rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:gap-3 items-end"
                >
                  <div className="space-y-1 min-w-0">
                    <label className="text-[11px] font-medium text-slate-300">Field Name</label>
                    <Combobox options={(fillValues?.customFields || []).map((field: any) => ({
                      label: field.customFieldName || '',
                      value: (field.customFieldNo || '').toString()
                    }))}
                      value={cf.customFieldNo}
                      onChange={(val) => updateField(index, 'customFieldNo', val)}
                      placeholder="Select custom field..."
                      className="h-9 rounded-[8px] border border-[var(--tm-border)] text-xs bg-[var(--tm-surface)] shadow-tm-control w-full"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[11px] font-medium text-slate-300">Value</label>
                    {renderValueField(cf, index)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => requestRemoveField(index)}
                    className="h-9 w-9 rounded-[8px] border-[var(--tm-border)] text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 shrink-0"
                    title="Remove field"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--tm-border)] bg-[var(--tm-elevated)] px-4 py-5 text-center">
            <p className="text-xs font-medium text-slate-500">No additional fields added yet.</p>
            {!hideAddButton ? (
              <button
                type="button"
                onClick={addField}
                className="mt-1.5 text-[11px] font-semibold text-[#0EA5E9] hover:underline"
              >
                + Add Additional Field
              </button>
            ) : null}
          </div>
        )}
      </div>

      <MasterDeleteDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.onOpenChange}
        onConfirm={deleteConfirm.handleConfirm}
        recordName={deleteConfirm.recordName}
        entityLabel={deleteConfirm.entityLabel}
        confirming={deleteConfirm.confirming}
      />
    </section>
  );
}
