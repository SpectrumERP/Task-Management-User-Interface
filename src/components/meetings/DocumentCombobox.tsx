import * as React from "react"
import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { apiService } from "@/services/apiService"
import { sortByLabel } from "@/lib/sortOptions"

interface DocumentComboboxProps {
  value: string | undefined
  onChange: (doc: any) => void
  formNo: number
  contextStr: string
  displayColumnsStr?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  error?: boolean
  modal?: boolean
}

export function DocumentCombobox({
  value,
  onChange,
  formNo,
  contextStr,
  displayColumnsStr = "",
  placeholder = "Search document...",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
  modal = false,
}: DocumentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")

  const isInitialized = React.useRef(false);
  const lastInitialLabelRef = React.useRef(initialLabel);
  const optionsRef = React.useRef(options);

  // Parse display columns
  const displayColumns = React.useMemo(() => {
    return displayColumnsStr ? displayColumnsStr.split(',').map(c => c.trim()) : [];
  }, [displayColumnsStr]);

  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "");
      lastInitialLabelRef.current = initialLabel;
      isInitialized.current = false;
    }
  }, [initialLabel]);

  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel);
      isInitialized.current = true;
      return;
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find(o =>
        (o.id?.toString() === value) || (o.documentNo?.toString() === value) || (o.Value?.toString() === value)
      );
      if (matchedInOptions) {
        setSelectedLabel(matchedInOptions.documentNoYearly || matchedInOptions.DocumentNoYearly || matchedInOptions.Text || matchedInOptions.name || value);
        isInitialized.current = true;
        return;
      }
    } else {
      setSelectedLabel("");
    }
    isInitialized.current = true;
  }, [value, initialLabel]);

  React.useEffect(() => {
    if (!open) return;
    if (!formNo) return; // Don't fetch if formNo is missing

    let active = true;

    const fetchDocs = async () => {
      setIsLoading(true);
      try {
        const res = await apiService.get<any>(`/api/crm/meeting-notes/document-details?formNo=${formNo}&keyword=${search}&context=${contextStr}`);
        const data = res?.data || res || [];
        if (active) {
          setOptions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to search documents:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (search.trim() === "") {
      setOptions([]);
    } else {
      const timer = setTimeout(fetchDocs, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open, formNo, contextStr])

  // Helper to get ID
  const getId = (doc: any) => {
    return doc.id || doc.documentNo || doc.Value || doc.DocumentNo;
  };

  // Helper to get primary display label
  const getLabel = (doc: any) => {
    return doc.documentNoYearly || doc.DocumentNoYearly || doc.Text || doc.name || doc.DocumentNo;
  };

  const sortedDocs = React.useMemo(
    () =>
      sortByLabel(options, {
        getLabel: (doc) => getLabel(doc),
        getValue: (doc) => String(getId(doc) ?? ''),
      }),
    // getId / getLabel are stable per render of this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options]
  )
  const gridCols = { gridTemplateColumns: `repeat(${Math.max(displayColumns.length, 1)}, minmax(0, 1fr))` }

  return (
    <CrmSearchSelect<any>
      items={sortedDocs}
      getKey={(doc) => String(getId(doc) ?? getLabel(doc))}
      getLabel={(doc) => getLabel(doc)}
      selectedKeys={value ? [String(value)] : []}
      onSelect={(doc) => {
        onChange(doc)
        setSelectedLabel(getLabel(doc))
      }}
      onClear={() => onChange(null)}
      clearable={isClearable}
      displayLabel={selectedLabel}
      placeholder={placeholder}
      emptyText="No data found."
      disabled={disabled}
      invalid={error}
      onQueryChange={setSearch}
      serverSearch
      loading={isLoading}
      loadingText="Searching documents…"
      onOpenChange={setOpen}
      className={cn(!className?.includes("h-") && "h-9", className)}
      modal={modal}
      header={
        displayColumns.length > 0 ? (
          <div className="grid gap-2 border-b border-[#EEF2F6] bg-[#F1F5F9] px-3 py-2 text-[11px] font-bold text-[#4a5d82] dark:border-[var(--tm-border)] dark:bg-[var(--tm-elevated)] dark:text-slate-400" style={gridCols}>
            {displayColumns.map((col) => (
              <div key={col}>{col}</div>
            ))}
          </div>
        ) : undefined
      }
      renderOption={(doc) =>
        displayColumns.length > 0 ? (
          <div className="grid items-center gap-2 text-xs" style={gridCols}>
            {displayColumns.map((col, i) => {
              const val = doc[col] || doc[col.charAt(0).toLowerCase() + col.slice(1)]
              return (
                <div key={col} className={cn('truncate', i === 0 ? 'font-semibold text-[#0c1a3a] dark:text-slate-100' : 'text-[#4a5d82] dark:text-slate-300')}>
                  {val || 'N/A'}
                </div>
              )
            })}
          </div>
        ) : (
          <span className="block truncate text-xs font-semibold text-[#0c1a3a] dark:text-slate-100">{getLabel(doc)}</span>
        )
      }
    />
  )
}
