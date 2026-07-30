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

interface MultiSelectProps {
  options: { label: string; value: string }[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isClearable?: boolean
  modal?: boolean
  maxVisible?: number
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  className,
  disabled = false,
  isClearable = true,
  modal = false,
  maxVisible = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter((option) => value.includes(option.value))

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-medium text-sm rounded-xl min-h-[36px] h-auto shadow-sm transition-all border relative pr-8 py-1.5",
            !className?.includes("border-") && "border-slate-300",
            className,
            FIELD_TEXT_STYLE,
            value.length === 0 && "text-slate-400"
          )}
        >
          <div className="flex flex-wrap gap-1 pr-2 max-w-full overflow-hidden">
            {selectedOptions.length > 0 ? (
                <>
                  {selectedOptions.slice(0, maxVisible).map(opt => (
                      <span key={opt.value} className="bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-md truncate max-w-[100px]">
                          {opt.label}
                      </span>
                  ))}
                  {selectedOptions.length > maxVisible && (
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-medium">
                          +{selectedOptions.length - maxVisible} more
                      </span>
                  )}
                </>
            ) : (
                <span className="truncate py-0.5">{placeholder}</span>
            )}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value.length > 0 && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
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
      <PopoverPrimitive.Content 
          className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" 
          align="start"
        >
        <Command className="rounded-xl border-slate-200">
          <CommandInput autoFocus placeholder={searchPlaceholder} className="h-9 border-none focus:ring-0" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-3 text-center text-xs text-slate-500">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(value.filter(v => v !== option.value));
                      } else {
                        onChange([...value, option.value]);
                      }
                    }}
                    className="text-xs font-medium py-2 px-3 flex items-center justify-between cursor-pointer"
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 text-[#006699]",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
    </Popover>
  )
}
