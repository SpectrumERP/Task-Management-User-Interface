import * as React from "react"
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  isSameDay,
} from "date-fns"
import { Calendar as CalendarIcon, Check } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: { from?: Date; to?: Date }
  onChange?: (range: { from?: Date; to?: Date } | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  disabled,
}: DateRangePickerProps) {
  // Convert standard { from?: Date; to?: Date } to react-day-picker's DateRange type
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    if (!value) return undefined;
    return {
      from: value.from,
      to: value.to
    };
  });

  // Sync state with value prop
  React.useEffect(() => {
    if (value && (value.from || value.to)) {
      setRange({ from: value.from, to: value.to });
    } else {
      setRange(undefined);
    }
  }, [value]);

  // Date presets list
  const presets = React.useMemo(() => {
    const today = new Date();
    return [
      {
        label: "Today",
        value: { from: today, to: today }
      },
      {
        label: "Yesterday",
        value: { from: subDays(today, 1), to: subDays(today, 1) }
      },
      {
        label: "Last 7 days",
        value: { from: subDays(today, 6), to: today }
      },
      {
        label: "Last 14 days",
        value: { from: subDays(today, 13), to: today }
      },
      {
        label: "Last 30 days",
        value: { from: subDays(today, 29), to: today }
      },
      {
        label: "This Week",
        value: {
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 })
        }
      },
      {
        label: "Last Week",
        value: {
          from: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
          to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
        }
      },
      {
        label: "This Month",
        value: {
          from: startOfMonth(today),
          to: endOfMonth(today)
        }
      },
      {
        label: "Last Month",
        value: {
          from: startOfMonth(subMonths(today, 1)),
          to: endOfMonth(subMonths(today, 1))
        }
      }
    ];
  }, []);

  const checkPresetActive = (presetVal: { from: Date; to: Date }) => {
    if (!range?.from || !range?.to) return false;
    return isSameDay(range.from, presetVal.from) && isSameDay(range.to, presetVal.to);
  };

  const selectPreset = (presetVal: { from: Date; to: Date }) => {
    const newRange = { from: presetVal.from, to: presetVal.to };
    setRange(newRange);
    if (onChange) {
      onChange(newRange);
    }
  };

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    if (onChange) {
      onChange(newRange ? { from: newRange.from, to: newRange.to } : undefined);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-bold rounded-2xl h-11 border-slate-200 bg-white shadow-sm text-xs transition-all text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[#006699]/15",
              !range && "text-slate-400 font-medium"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
            {range?.from ? (
              range.to ? (
                <span className="text-slate-700 font-bold text-xs">
                  {format(range.from, "LLL dd, yyyy")} - {format(range.to, "LLL dd, yyyy")}
                </span>
              ) : (
                <span className="text-slate-700 font-bold text-xs">
                  {format(range.from, "LLL dd, yyyy")}
                </span>
              )
            ) : (
              <span className="text-slate-400 font-medium text-xs">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto p-0 rounded-[24px] border-slate-100 shadow-2xl z-[150]" align="start">
          {/* Preset Shortcuts Sidebar */}
          <div className="w-[140px] border-r border-slate-100 p-2 flex flex-col gap-0.5 shrink-0 bg-slate-50/60 rounded-l-[24px] justify-center">
            {presets.map((preset) => {
              const isActive = checkPresetActive(preset.value);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectPreset(preset.value)}
                  className={cn(
                    "w-full text-left text-[11px] px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-between",
                    isActive
                      ? "bg-[#006699] text-white shadow-md shadow-[#006699]/10"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <span>{preset.label}</span>
                  {isActive && <Check size={11} className="text-white shrink-0" />}
                </button>
              );
            })}
          </div>

          <Calendar
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
            className="rounded-r-[24px] border-none p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
