import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ date, onChange, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-bold rounded-2xl h-11 bg-white shadow-sm text-xs transition-all text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-[#006699]/15 border",
            !className?.includes("border-") && "border-slate-200",
            !date && "text-slate-400 font-medium",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
          {date ? (
            <span className="text-slate-700 font-bold text-xs">{format(date, "MMM dd, yyyy")}</span>
          ) : (
            <span className="text-slate-400 font-medium text-xs">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-2xl z-[150]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          className="rounded-2xl border-none p-3"
        />
      </PopoverContent>
    </Popover>
  )
}
