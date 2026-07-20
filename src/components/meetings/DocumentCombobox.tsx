import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiService } from "@/services/apiService"

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

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !formNo}
          className={cn(
            "w-full justify-between transition-all border shadow-sm relative pr-8 rounded-full",
            !className?.includes("border-") && "border-slate-300",
            !className?.includes("text-") && "text-sm font-medium text-slate-900",
            !className?.includes("h-") && "h-8",
            className,
            error && "!border-red-500 text-red-500"
          )}
        >
          <span className={cn("truncate pr-2", !selectedLabel && "text-slate-400 font-medium", error && "text-red-500")}>
            {selectedLabel || placeholder}
          </span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Content
        className="z-[100] w-[300px] sm:w-[400px] md:w-[600px] max-w-[90vw] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        align="start"
      >
        <Command className="rounded-xl border-slate-200" shouldFilter={false}>
          <div className="border-b border-slate-100 bg-slate-50/50">
            <CommandInput
              autoFocus
              placeholder="Type to search..."
              className="h-10 border-none focus:ring-0 bg-transparent"
              onValueChange={setSearch}
            />
          </div>

          {displayColumns.length > 0 && (
            <div className={`grid px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider`} style={{ gridTemplateColumns: `repeat(${displayColumns.length}, minmax(0, 1fr))` }}>
              {displayColumns.map(col => (
                <div key={col}>{col}</div>
              ))}
            </div>
          )}

          <CommandList className="max-h-72 scrollbar-hide">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs font-medium">Searching documents...</span>
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty className="py-8 text-center text-xs text-slate-500 font-medium">
                No data found.
              </CommandEmpty>
            )}
            {!isLoading && (
              <CommandGroup>
                {options.map((doc, idx) => (
                  <CommandItem
                    key={getId(doc) || idx}
                    value={getId(doc)?.toString()}
                    onSelect={() => {
                      onChange(doc)
                      setSelectedLabel(getLabel(doc))
                      setOpen(false)
                    }}
                    className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                  >
                    {displayColumns.length > 0 ? (
                      <div className={`grid w-full items-center gap-2`} style={{ gridTemplateColumns: `repeat(${displayColumns.length}, minmax(0, 1fr))` }}>
                        {displayColumns.map(col => {
                          const val = doc[col] || doc[col.charAt(0).toLowerCase() + col.slice(1)];
                          return <div key={col} className="truncate text-slate-600">{val || 'N/A'}</div>;
                        })}
                      </div>
                    ) : (
                      <div className="w-full text-slate-600">{getLabel(doc)}</div>
                    )}

                    {value === getId(doc)?.toString() && (
                      <Check className="h-3 w-3 text-[#006699] ml-2 shrink-0 absolute right-2" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
    </Popover>
  )
}
