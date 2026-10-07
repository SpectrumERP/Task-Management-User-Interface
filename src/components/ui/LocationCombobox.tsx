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
import { locationService, LocationResponse, formatLocationDisplayLabel } from "@/services/locationService"
import { sortByLabel } from "@/lib/sortOptions"

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

  const isInitialized = React.useRef(false)
  const lastInitialLabelRef = React.useRef(initialLabel)
  const optionsRef = React.useRef(options)

  React.useEffect(() => {
    optionsRef.current = options
  }, [options])

  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "")
      lastInitialLabelRef.current = initialLabel
      isInitialized.current = false
    }
  }, [initialLabel])

  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel)
      isInitialized.current = true
      return
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find((l) => l.operLocationNo.toString() === value)
      if (matchedInOptions) {
        setSelectedLabel(formatLocationDisplayLabel(matchedInOptions))
        if (onResolve) onResolve(matchedInOptions)
        isInitialized.current = true
        return
      }

      const resolveLocation = async () => {
        setIsLoading(true)
        try {
          const results = await locationService.searchLocations("")
          const matched = results.find((l) => l.operLocationNo.toString() === value)
          if (matched) {
            setSelectedLabel(formatLocationDisplayLabel(matched))
            if (onResolve) onResolve(matched)
          }
        } catch (err) {
          console.error("Failed to resolve location label:", err)
        } finally {
          setIsLoading(false)
        }
      }
      resolveLocation()
    } else {
      setSelectedLabel("")
    }
    isInitialized.current = true
  }, [value, initialLabel])

  React.useEffect(() => {
    if (!open) return

    let active = true

    const fetchLocations = async () => {
      setIsLoading(true)
      try {
        const results = await locationService.searchLocations(search)
        if (active) setOptions(results)
      } catch (err) {
        console.error("Failed to search locations:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (search === "") {
      fetchLocations()
    } else {
      const timer = setTimeout(fetchLocations, 300)
      return () => {
        active = false
        clearTimeout(timer)
      }
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
            !className?.includes("text-") && "text-sm font-medium text-slate-50",
            !className?.includes("h-") && "h-9",
            className,
            "rounded-[8px]",
            error ? "!border-red-500 text-red-500" : "border-[var(--tm-border)]"
          )}
        >
          <span
            className={cn(
              "truncate pr-2 text-left",
              !selectedLabel && "text-slate-400 font-medium",
              error && "text-red-500"
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onChange({ operLocationNo: "" } as any)
                  setSelectedLabel("")
                }}
                className="p-0.5 rounded-full hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
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
          className={cn(
            "z-[100] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
            "max-w-[calc(100vw-1.5rem)]",
            "overflow-hidden pointer-events-auto",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          style={{ width: "max(var(--radix-popover-trigger-width), 260px)" }}
          align="start"
          sideOffset={4}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command className="w-full bg-transparent" shouldFilter={false}>
            <div className="shrink-0 border-b border-[var(--tm-border)] bg-[var(--tm-muted)]/50">
              <CommandInput
                placeholder="Search location..."
                className="h-10 border-none focus:ring-0 bg-transparent"
                onValueChange={setSearch}
              />
            </div>

            <CommandList className="max-h-64 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
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
              {!isLoading && options.length > 0 && (
                <CommandGroup className="overflow-visible p-1">
                  {sortByLabel(options, {
                    getLabel: (loc) => formatLocationDisplayLabel(loc),
                    getValue: (loc) => String(loc.operLocationNo),
                  }).map((location) => {
                    const isSelected = value === location.operLocationNo.toString()

                    return (
                      <CommandItem
                        key={location.operLocationNo}
                        value={String(location.operLocationNo)}
                        onSelect={() => {
                          onChange(location)
                          setSelectedLabel(formatLocationDisplayLabel(location))
                          setOpen(false)
                        }}
                        className={cn(
                          "rounded-[8px] px-3 py-2 cursor-pointer w-full",
                          "aria-selected:bg-[var(--tm-tint)] data-[selected=true]:bg-[var(--tm-tint)]"
                        )}
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className="flex-1 truncate text-[12px] font-semibold text-slate-50" title={location.operLocationName || "—"}>
                            {location.operLocationName || "—"}
                          </span>
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[#0EA5E9]" />
                          ) : <span className="w-3.5" />}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>

            {onAddNew && (
              <div className="shrink-0 p-1 border-t border-[var(--tm-border)] bg-[var(--tm-muted)]/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    setTimeout(() => onAddNew?.(), 0)
                  }}
                  className="w-full justify-start text-[#0EA5E9] hover:text-[#0284C7] hover:bg-[var(--tm-muted)]/80 h-8 px-2.5 text-xs font-black gap-1.5 rounded-lg transition-all active:scale-[0.98] select-none"
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
