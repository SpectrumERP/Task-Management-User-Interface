import * as React from "react"
import { Check, ChevronsUpDown, X, Plus } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { FIELD_TEXT_STYLE } from "@/lib/fieldStyles"
import { Button } from "@/components/ui/button"
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

import { getContrastColor } from "@/lib/colorUtils"

interface ComboboxProps {
  options: { label: string; value: string; colorCoding?: string; description?: string }[]
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isClearable?: boolean
  onAddNew?: () => void
  addNewLabel?: string
  modal?: boolean
  onSearchChange?: (search: string) => void
  shouldFilter?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  className,
  disabled = false,
  isClearable = true,
  onAddNew,
  addNewLabel = "Add New",
  modal = false,
  onSearchChange,
  shouldFilter = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
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

  const selectedOption = options.find((option) => option.value === value)

  const sortedOptions = React.useMemo(
    () =>
      [...options].sort((a, b) =>
        String(a.label || '').localeCompare(String(b.label || ''), undefined, {
          sensitivity: 'base',
          numeric: true,
        })
      ),
    [options]
  )

  const trigger = (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-medium text-sm h-9 shadow-sm transition-all border border-[var(--tm-border)] relative pr-8",
            "disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[var(--tm-elevated)] disabled:hover:bg-[var(--tm-elevated)]",
            className,
            FIELD_TEXT_STYLE,
            !value && "text-slate-400",
            "rounded-[8px]",
            !(typeof className === "string" && /border-red/.test(className)) && "!border-[var(--tm-border)]"
          )}
        >
          <div className="flex-1 overflow-hidden flex items-center pr-2">
            {selectedOption ? (
              selectedOption.colorCoding && selectedOption.colorCoding !== 'none' ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium shadow-sm truncate"
                  style={{ backgroundColor: selectedOption.colorCoding, color: getContrastColor(selectedOption.colorCoding) }}
                >
                  {selectedOption.label}
                </span>
              ) : (
                <span className="truncate">{selectedOption.label}</span>
              )
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-0.5 rounded-full hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal container={container || document.body}>
      <PopoverPrimitive.Content 
          className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" 
          align="start"
        >
        <Command className="rounded-xl border-[var(--tm-border)]" shouldFilter={shouldFilter}>
          <CommandInput 
            value={search} 
            onValueChange={(val) => {
              setSearch(val)
              onSearchChange?.(val)
            }} 
            placeholder={searchPlaceholder} 
            className="h-9 border-none focus:ring-0" 
          />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-3 text-center text-xs text-slate-500">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setOpen(false)
                  }}
                  className="text-xs font-medium py-2 px-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <div className="flex items-center">
                      {option.colorCoding && option.colorCoding !== 'none' ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-medium shadow-sm"
                          style={{ backgroundColor: option.colorCoding, color: getContrastColor(option.colorCoding) }}
                        >
                          {option.label}
                        </span>
                      ) : (
                        <span className="truncate">{option.label}</span>
                      )}
                    </div>
                    {option.description && (
                      <span className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 text-[#0EA5E9]",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onAddNew && (
            <div className="p-1 border-t border-[var(--tm-border)] bg-[var(--tm-muted)]/50">
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

  return trigger
}

