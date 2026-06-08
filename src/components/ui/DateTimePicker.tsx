import React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  date?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  hideTime?: boolean
}

export function DateTimePicker({ date, onChange, placeholder, className, disabled, hideTime = false }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const defaultPlaceholder = hideTime ? "Pick a date" : "Pick a date and time";
  const displayPlaceholder = placeholder || defaultPlaceholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-medium rounded-xl bg-white shadow-sm text-sm transition-all text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-[#006699]/15 border",
            !className?.includes("border-") && "border-slate-300",
            !date && "text-slate-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500 shrink-0" />
          {date ? (
            <span className="truncate">{format(date, hideTime ? "PPP" : "PPP p")}</span>
          ) : (
            <span className="truncate">{displayPlaceholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-2xl z-[150]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              if (date) {
                selectedDate.setHours(date.getHours(), date.getMinutes())
              }
              onChange?.(selectedDate)
              if (hideTime) {
                setIsOpen(false);
              }
            } else {
              onChange?.(undefined)
            }
          }}
          className="rounded-2xl border-none p-3 pb-0"
        />
        {!hideTime && (
          <div className="p-3 pt-2 border-t border-slate-100 flex flex-col gap-2.5 bg-slate-50/50 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-600  ">Time Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Hours Selector */}
              <Select
                value={date ? (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12).toString() : "12"}
                onValueChange={(val) => {
                  const newDate = date ? new Date(date) : new Date();
                  let hrs = parseInt(val, 10);
                  const isPM = newDate.getHours() >= 12;
                  if (isPM && hrs < 12) hrs += 12;
                  if (!isPM && hrs === 12) hrs = 0;
                  newDate.setHours(hrs);
                  onChange?.(newDate);
                }}
              >
                <SelectTrigger className="h-9 w-[64px] rounded-xl border-slate-200 bg-white font-bold text-xs text-slate-700 shadow-sm focus:ring-1 focus:ring-[#006699]/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[200px]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <SelectItem key={h} value={h.toString()} className="text-xs font-semibold rounded-lg">{h.toString().padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-slate-400 font-bold text-xs">:</span>

              {/* Minutes Selector */}
              <Select
                value={date ? date.getMinutes().toString() : "0"}
                onValueChange={(val) => {
                  const newDate = date ? new Date(date) : new Date();
                  newDate.setMinutes(parseInt(val, 10));
                  onChange?.(newDate);
                }}
              >
                <SelectTrigger className="h-9 w-[64px] rounded-xl border-slate-200 bg-white font-bold text-xs text-slate-700 shadow-sm focus:ring-1 focus:ring-[#006699]/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[200px]">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <SelectItem key={m} value={m.toString()} className="text-xs font-semibold rounded-lg">{m.toString().padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* AM/PM Selector */}
              <Select
                value={date && date.getHours() >= 12 ? "PM" : "AM"}
                onValueChange={(val) => {
                  const newDate = date ? new Date(date) : new Date();
                  const currentHrs = newDate.getHours();
                  if (val === "PM" && currentHrs < 12) {
                    newDate.setHours(currentHrs + 12);
                  } else if (val === "AM" && currentHrs >= 12) {
                    newDate.setHours(currentHrs - 12);
                  }
                  onChange?.(newDate);
                }}
              >
                <SelectTrigger className="h-9 w-[64px] rounded-xl border-slate-200 bg-white font-bold text-xs text-slate-700 shadow-sm focus:ring-1 focus:ring-[#006699]/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="AM" className="text-xs font-bold rounded-lg">AM</SelectItem>
                  <SelectItem value="PM" className="text-xs font-bold rounded-lg">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
