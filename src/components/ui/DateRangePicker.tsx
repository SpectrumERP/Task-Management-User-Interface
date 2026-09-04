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
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Convert standard { from?: Date; to?: Date } to react-day-picker's DateRange type
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    if (!value) return undefined;
    return {
      from: value.from,
      to: value.to
    };
  });

  const [isOpen, setIsOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(range);

  // Sync state with value prop
  React.useEffect(() => {
    if (value && (value.from || value.to)) {
      setRange({ from: value.from, to: value.to });
      setTempRange({ from: value.from, to: value.to });
    } else {
      setRange(undefined);
      setTempRange(undefined);
    }
  }, [value]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempRange(range);
    }
  };

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
      },
      {
        label: "Last 6 Months",
        value: {
          from: subMonths(today, 6),
          to: today
        }
      }
    ];
  }, []);

  const checkPresetActive = (presetVal: { from: Date; to: Date }) => {
    if (!tempRange?.from || !tempRange?.to) return false;
    return isSameDay(tempRange.from, presetVal.from) && isSameDay(tempRange.to, presetVal.to);
  };

  const selectPreset = (presetVal: { from: Date; to: Date }) => {
    setTempRange({ from: presetVal.from, to: presetVal.to });
  };

  const handleSelect = (newRange: DateRange | undefined) => {
    setTempRange(newRange);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleOk = () => {
    setRange(tempRange);
    if (onChange) {
      onChange(tempRange ? { from: tempRange.from, to: tempRange.to } : undefined);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full h-10 justify-start text-left font-medium rounded-[8px] border border-[#a8afb7] bg-white text-xs shadow-none transition-all text-slate-800 hover:bg-[#f8fbfd] hover:border-[#006699]/35 focus-visible:ring-2 focus-visible:ring-[#006699]/15",
              !range && "text-slate-400"
            )}
          >
            <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#e8f3f8] text-[#006699]">
              <CalendarIcon className="h-3.5 w-3.5" />
            </span>
            {range?.from ? (
              range.to ? (
                <span className="truncate text-slate-800 text-xs">
                  {format(range.from, "LLL dd, yyyy")} – {format(range.to, "LLL dd, yyyy")}
                </span>
              ) : (
                <span className="truncate text-slate-800 text-xs">
                  {format(range.from, "LLL dd, yyyy")}
                </span>
              )
            ) : (
              <span className="truncate text-slate-400 text-xs">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "flex p-0 rounded-[24px] border-slate-100 shadow-2xl z-[150]",
            isMobile ? "flex-col w-[92vw] max-w-[340px]" : "flex-row w-auto"
          )}
          align="start"
        >
          {/* Preset Shortcuts Sidebar / Mobile Header Strip */}
          <div
            className={cn(
              "shrink-0 bg-slate-50/60 flex",
              isMobile
                ? "w-full border-b border-slate-100 p-2 flex-row gap-1.5 rounded-t-[24px] overflow-x-auto scrollbar-none"
                : "w-[140px] border-r border-slate-100 p-2 flex-col gap-0.5 rounded-l-[24px] justify-center"
            )}
          >
            {presets.map((preset) => {
              const isActive = checkPresetActive(preset.value);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectPreset(preset.value)}
                  className={cn(
                    "text-[11px] px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-between shrink-0",
                    isMobile ? "h-8 px-3" : "w-full py-1.5 text-left",
                    isActive
                      ? "bg-[#006699] text-white shadow-md shadow-[#006699]/10"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <span>{preset.label}</span>
                  {!isMobile && isActive && <Check size={11} className="text-white shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col">
            <Calendar
              mode="range"
              defaultMonth={tempRange?.from}
              selected={tempRange}
              onSelect={handleSelect}
              numberOfMonths={isMobile ? 1 : 2}
              className={cn(
                "border-none p-3",
                isMobile ? "" : "rounded-tr-[24px]"
              )}
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-100 mt-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                className="h-8 px-4 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleOk}
                className="h-8 px-5 text-xs font-bold rounded-xl bg-[#006699] text-white hover:bg-[#005580] shadow-sm"
              >
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
