import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react"
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
import { locationService, LocationResponse } from "@/services/locationService"

const GRID_COLS = "grid-cols-[1.1fr_1.6fr_0.9fr_0.9fr_0.9fr]"

interface LocationComboboxProps {
  value: string | undefined
  onChange: (location: LocationResponse) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  error?: boolean
  onResolve?: (location: LocationResponse) => void
  modal?: boolean
  onAddNew?: () => void
  addNewLabel?: string
}

export function LocationCombobox({
  value,
  onChange,
  placeholder = "Select location",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
  onResolve,
  modal = false,
  onAddNew,
  addNewLabel = "Add New",
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<LocationResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (open) {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs.length > 0) {
        setContainer(dialogs[dialogs.length - 1] as HTMLElement)
      } else {
        setContainer(null)
      }
    }
  }, [open])

  const isInitialized = React.useRef(false);
  const lastInitialLabelRef = React.useRef(initialLabel);
  const optionsRef = React.useRef(options);

  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle dynamic initialLabel changes from the parent
  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "");
      lastInitialLabelRef.current = initialLabel;
      isInitialized.current = false;
    }
  }, [initialLabel]);

  // Handle initial label and resolve location name if value changes
  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel);
      isInitialized.current = true;
      return;
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find(l => l.operLocationNo.toString() === value);
      if (matchedInOptions) {
        setSelectedLabel(matchedInOptions.operLocationName);
        if (onResolve) onResolve(matchedInOptions);
        isInitialized.current = true;
        return;
      }

      const resolveLocation = async () => {
        setIsLoading(true);
        try {
          const results = await locationService.searchLocations('');
          const matched = results.find(l => l.operLocationNo.toString() === value);
          if (matched) {
            setSelectedLabel(matched.operLocationName);
            if (onResolve) onResolve(matched);
          }
        } catch (err) {
          console.error("Failed to resolve location label:", err);
        } finally {
          setIsLoading(false);
        }
      };
      resolveLocation();
    } else {
      setSelectedLabel("");
    }
    isInitialized.current = true;
  }, [value, initialLabel]);

  // Debounced keyword search with immediate fetch on open
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const results = await locationService.searchLocations(search);
        if (active) {
          setOptions(results);
        }
      } catch (err) {
        console.error("Failed to search locations:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (search === "") {
      fetchLocations();
    } else {
      const timer = setTimeout(fetchLocations, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between transition-all border shadow-sm relative pr-8",
            !className?.includes("border-") && "border-slate-300",
            !className?.includes("text-") && "text-sm font-medium text-slate-900",
            !className?.includes("rounded-") && "rounded-xl",
            !className?.includes("h-") && "h-9",
            className,
            error && "!border-red-500 text-red-500"
          )}
        >
          <span className={cn("truncate pr-2", !selectedLabel && "text-slate-400 font-medium", error && "text-red-500")}>{selectedLabel || placeholder}</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ operLocationNo: '' } as any);
                  setSelectedLabel("");
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
      <PopoverPrimitive.Portal container={container || document.body}>
        <PopoverPrimitive.Content
          className="z-[100] w-[550px] sm:w-[700px] md:w-[800px] max-w-[95vw] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
        >
          <Command className="rounded-xl border-slate-200" shouldFilter={false}>
            <div className="border-b border-slate-100 bg-slate-50/50">
              <CommandInput
                placeholder="Search by location, address, city, state or country..."
                className="h-10 border-none focus:ring-0 bg-transparent"
                onValueChange={setSearch}
              />
            </div>

            <div className={cn("grid px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider gap-2", GRID_COLS)}>
              <div>Location</div>
              <div>Address</div>
              <div>City</div>
              <div>State</div>
              <div>Country</div>
            </div>

            <CommandList className="max-h-72 scrollbar-hide overflow-x-hidden">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs font-medium">Searching locations...</span>
                </div>
              )}
              {!isLoading && options.length === 0 && (
                <CommandEmpty className="py-8 text-center text-xs text-slate-500 font-medium">
                  No data found.
                </CommandEmpty>
              )}
              {!isLoading && (
                <CommandGroup>
                  {options.map((location) => (
                    <CommandItem
                      key={location.operLocationNo}
                      value={`${location.operLocationName} ${location.address} ${location.cityName} ${location.stateName} ${location.countryName}`}
                      onSelect={() => {
                        onChange(location)
                        setSelectedLabel(location.operLocationName)
                        setOpen(false)
                      }}
                      className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                    >
                      <div className={cn("grid w-full items-center gap-2", GRID_COLS)}>
                        <div className="truncate text-slate-900 font-bold">{location.operLocationName}</div>
                        <div className="truncate text-slate-600 font-semibold">{location.address}</div>
                        <div className="truncate text-slate-500 font-medium">{location.cityName}</div>
                        <div className="truncate text-slate-500 font-medium">{location.stateName}</div>
                        <div className="truncate text-slate-500 font-medium">{location.countryName}</div>
                      </div>
                      {value === location.operLocationNo.toString() && (
                        <Check className="h-3 w-3 text-[#006699] ml-2 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            {onAddNew && (
              <div className="p-1 border-t border-slate-150 bg-slate-50/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    setTimeout(() => {
                      if (onAddNew) onAddNew();
                    }, 0);
                  }}
                  className="w-full justify-start text-[#006699] hover:text-[#005580] hover:bg-slate-100/80 h-8 px-2.5 text-xs font-black gap-1.5 rounded-lg transition-all active:scale-[0.98] select-none"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  {addNewLabel}
                </Button>
              </div>
            )}
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
