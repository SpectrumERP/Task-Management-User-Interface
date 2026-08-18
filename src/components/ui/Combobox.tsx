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

interface ComboboxProps {
  options: { label: string; value: string }[]
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
  modal = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (open) {
      setContainer(document.querySelector('[role="dialog"]') as HTMLElement)
    }
  }, [open])

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-medium text-sm rounded-xl h-9 shadow-sm transition-all border relative pr-8",
            !className?.includes("border-") && "border-slate-300",
            className,
            FIELD_TEXT_STYLE,
            !value && "text-slate-400"
          )}
        >
          <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
        <Command className="rounded-xl border-slate-200">
          <CommandInput value={search} onValueChange={setSearch} placeholder={searchPlaceholder} className="h-9 border-none focus:ring-0" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-3 text-center text-xs text-slate-500">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setOpen(false)
                  }}
                  className="text-xs font-medium py-2 px-3 flex items-center justify-between cursor-pointer"
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 text-[#006699]",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onAddNew && (
            <div className="p-1 border-t border-slate-150 bg-slate-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNew();
                  setOpen(false);
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

