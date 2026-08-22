import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

const CHIP_GAP_PX = 4 // matches the chip row's gap-1

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
  maxVisible,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter((option) => value.includes(option.value))

  // Dynamic mode (default, when maxVisible isn't forced): measure the real chip row width
  // and show as many chips as actually fit, collapsing the rest into "+N more".
  const containerRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLDivElement>(null)
  const moreRef = React.useRef<HTMLSpanElement>(null)
  const [dynamicVisible, setDynamicVisible] = React.useState(selectedOptions.length)

  React.useLayoutEffect(() => {
    if (maxVisible !== undefined) return
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const recalc = () => {
      const available = container.offsetWidth
      const chipEls = Array.from(measure.children) as HTMLElement[]
      if (chipEls.length === 0) {
        setDynamicVisible(0)
        return
      }

      const totalWidth = chipEls.reduce((sum, el, i) => sum + el.offsetWidth + (i > 0 ? CHIP_GAP_PX : 0), 0)
      if (totalWidth <= available) {
        setDynamicVisible(chipEls.length)
        return
      }

      const moreWidth = moreRef.current?.offsetWidth || 0
      const budget = available - moreWidth - CHIP_GAP_PX
      let used = 0
      let count = 0
      for (let i = 0; i < chipEls.length; i++) {
        const next = used + chipEls[i].offsetWidth + (i > 0 ? CHIP_GAP_PX : 0)
        if (next <= budget) {
          used = next
          count++
        } else {
          break
        }
      }
      setDynamicVisible(Math.max(count, 1))
    }

    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(container)
    return () => ro.disconnect()
  }, [selectedOptions.map(o => o.value).join(','), maxVisible])

  const effectiveVisible = maxVisible !== undefined ? maxVisible : dynamicVisible

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
          <div ref={containerRef} className="relative flex flex-1 min-w-0 flex-nowrap gap-1 pr-2 overflow-hidden">
            {selectedOptions.length > 0 ? (
                <>
                  {selectedOptions.slice(0, effectiveVisible).map(opt => (
                      <span key={opt.value} className="bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-md truncate max-w-[160px] shrink-0">
                          {opt.label}
                      </span>
                  ))}
                  {selectedOptions.length > effectiveVisible && (
                      <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0">
                          +{selectedOptions.length - effectiveVisible} more
                      </span>
                  )}
                  {/* Hidden measuring clones: same markup as the visible chips, used to compute how many actually fit. */}
                  <div ref={measureRef} className="absolute left-0 top-0 flex gap-1" style={{ visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                    {selectedOptions.map(opt => (
                      <span key={opt.value} className="bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-md truncate max-w-[160px] shrink-0">
                        {opt.label}
                      </span>
                    ))}
                  </div>
                  <span ref={moreRef} className="absolute left-0 top-0 bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                    +99 more
                  </span>
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
