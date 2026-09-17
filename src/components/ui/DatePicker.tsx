import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
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
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-bold h-11 bg-[var(--tm-surface)] shadow-sm text-xs transition-all text-slate-200 hover:bg-[var(--tm-muted)] focus:ring-2 focus:ring-brand/15 border",
            !date && "text-slate-400 font-medium",
            className,
            "rounded-md border-[var(--tm-border)]"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
          {date ? (
            <span className="text-slate-200 font-bold text-xs flex-1 truncate">{format(date, "MMM dd, yyyy")}</span>
          ) : (
            <span className="text-slate-400 font-medium text-xs flex-1">{placeholder}</span>
          )}
          {date ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange?.(undefined)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange?.(undefined)
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-[var(--tm-border)] shadow-2xl z-[150]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => {
            onChange?.(next)
            setOpen(false)
          }}
          className="rounded-2xl border-none p-3"
        />
        <div className="flex items-center justify-end gap-1 border-t border-[var(--tm-border)] px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChange?.(undefined)
              setOpen(false)
            }}
            className="h-7 px-2 rounded-[7px] text-[10px] font-medium text-slate-500 hover:text-slate-200"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="h-7 px-3 rounded-[7px] text-[10px] font-semibold bg-brand hover:bg-brand-hover text-white"
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
