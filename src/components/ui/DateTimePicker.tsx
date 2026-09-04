import React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface DateTimePickerProps {
  date?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  hideTime?: boolean
}

const MINUTES = [0, 15, 30, 45]

function CompactStepper({
  label,
  value,
  onUp,
  onDown,
}: {
  label: string
  value: string
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-[7px] border border-slate-200/80 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDown}
        className="h-7 w-6 shrink-0 inline-flex items-center justify-center rounded-l-[6px] text-slate-500 hover:bg-[#e8f3f8] hover:text-[#006699] transition-colors"
        aria-label={`Decrease ${label}`}
      >
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
      </button>
      <span className="h-7 min-w-[1.6rem] px-0.5 inline-flex items-center justify-center text-[12px] font-semibold tabular-nums text-slate-800">
        {value}
      </span>
      <button
        type="button"
        onClick={onUp}
        className="h-7 w-6 shrink-0 inline-flex items-center justify-center rounded-r-[6px] text-slate-500 hover:bg-[#e8f3f8] hover:text-[#006699] transition-colors"
        aria-label={`Increase ${label}`}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
      </button>
    </div>
  )
}

export function DateTimePicker({
  date,
  onChange,
  placeholder,
  className,
  disabled,
  hideTime = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})
  const defaultPlaceholder = hideTime ? "Pick a date" : "Pick a date and time"
  const displayPlaceholder = placeholder || defaultPlaceholder

  const hour12 = date ? (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) : 12
  const minute = date ? date.getMinutes() : 0
  const period = date && date.getHours() >= 12 ? "PM" : "AM"

  const getPortalTarget = React.useCallback(() => {
    const trigger = rootRef.current
    if (!trigger) return document.body
    // Keep panel inside the Radix dialog portal so modal focus/outside handlers
    // don't swallow calendar clicks.
    const dialog = trigger.closest('[role="dialog"]')
    return (dialog?.parentElement as HTMLElement | null) || document.body
  }, [])

  const updatePanelPosition = React.useCallback(() => {
    const trigger = rootRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const panelWidth = 300
    let left = rect.left
    left = Math.min(left, window.innerWidth - panelWidth - 8)
    left = Math.max(8, left)

    const estimatedHeight = hideTime ? 280 : 340
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow

    if (placeAbove) {
      setPanelStyle({
        position: "fixed",
        left,
        width: panelWidth,
        bottom: window.innerHeight - rect.top + gap,
        top: "auto",
        zIndex: 9999,
      })
    } else {
      setPanelStyle({
        position: "fixed",
        left,
        width: panelWidth,
        top: rect.bottom + gap,
        bottom: "auto",
        zIndex: 9999,
      })
    }
  }, [hideTime])

  React.useEffect(() => {
    if (!isOpen) return
    updatePanelPosition()

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const inTrigger = rootRef.current?.contains(target)
      const inPanel = panelRef.current?.contains(target)
      if (!inTrigger && !inPanel) setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    const onReposition = () => updatePanelPosition()

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onReposition)
    // Capture scroll from nested form containers too
    window.addEventListener("scroll", onReposition, true)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onReposition)
      window.removeEventListener("scroll", onReposition, true)
    }
  }, [isOpen, updatePanelPosition])

  const applyTime = (next: { hour12?: number; minute?: number; period?: "AM" | "PM" }) => {
    const base = date ? new Date(date) : new Date()
    if (!date) base.setSeconds(0, 0)
    const h12 = next.hour12 ?? hour12
    const m = next.minute ?? minute
    const p = next.period ?? period
    let hrs = h12
    if (p === "PM" && hrs < 12) hrs += 12
    if (p === "AM" && hrs === 12) hrs = 0
    base.setHours(hrs, m, 0, 0)
    onChange?.(base)
  }

  const stepHour = (delta: number) => {
    let next = hour12 + delta
    if (next > 12) next = 1
    if (next < 1) next = 12
    applyTime({ hour12: next })
  }

  const stepMinute = (delta: number) => {
    const idx = MINUTES.includes(minute)
      ? MINUTES.indexOf(minute)
      : MINUTES.findIndex((m) => m > minute) - 1
    const safeIdx = idx < 0 ? 0 : idx
    const nextIdx = (safeIdx + delta + MINUTES.length) % MINUTES.length
    applyTime({ minute: MINUTES[nextIdx] })
  }

  const panel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          data-datetime-picker-panel=""
          style={panelStyle}
          className="rounded-[12px] border border-slate-200/80 bg-white shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)] overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="false"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 bg-[#f7fbfd]">
            <p className="text-[11px] font-semibold text-slate-800 truncate">
              {date
                ? format(date, hideTime ? "MMM dd, yyyy" : "EEE, MMM d · h:mm a")
                : hideTime
                  ? "Select date"
                  : "Select date & time"}
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-5 w-5 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="px-2 pt-1 pb-1.5">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                if (selectedDate) {
                  if (date) {
                    selectedDate.setHours(date.getHours(), date.getMinutes())
                  } else {
                    const hrs =
                      period === "PM" && hour12 < 12
                        ? hour12 + 12
                        : hour12 === 12 && period === "AM"
                          ? 0
                          : hour12
                    selectedDate.setHours(hrs, minute, 0, 0)
                  }
                  onChange?.(selectedDate)
                  if (hideTime) setIsOpen(false)
                } else {
                  onChange?.(undefined)
                }
              }}
              className="rounded-none border-none bg-transparent p-0 w-full"
              classNames={{
                root: "w-full",
                months: "relative w-full flex flex-col",
                month: "w-full gap-1.5",
                month_caption: "flex h-7 w-full items-center justify-center px-7",
                caption_label: "text-[12px] font-semibold text-slate-800",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                button_previous:
                  "size-6 rounded-full text-slate-500 hover:bg-[#e8f3f8] hover:text-[#006699] z-10",
                button_next:
                  "size-6 rounded-full text-slate-500 hover:bg-[#e8f3f8] hover:text-[#006699] z-10",
                month_grid: "w-full border-collapse table-fixed",
                weekdays: "w-full",
                weekday:
                  "h-6 p-0 text-center align-middle text-[9px] font-semibold uppercase tracking-wide text-slate-400",
                weeks: "w-full",
                week: "w-full",
                day: "relative h-8 w-[14.2857%] p-0 text-center align-middle",
                today: "bg-transparent",
                outside: "opacity-40",
              }}
              components={{
                DayButton: ({ day: _day, modifiers, ...props }) => (
                  <button
                    type="button"
                    {...props}
                    className={cn(
                      "mx-auto flex size-7 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors",
                      "hover:bg-[#e8f3f8] hover:text-[#006699]",
                      modifiers.outside && "text-slate-300",
                      modifiers.today &&
                        !modifiers.selected &&
                        "bg-[#e8f3f8] text-[#006699] font-semibold",
                      modifiers.selected &&
                        "bg-[#006699] text-white hover:bg-[#005580] hover:text-white font-semibold"
                    )}
                  />
                ),
              }}
            />
          </div>

          {/* Compact time + actions in one row */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-[#f8fbfd] px-2 py-1.5">
            {!hideTime && (
              <div className="flex items-center gap-1.5 shrink-0">
                <CompactStepper
                  label="hour"
                  value={String(hour12).padStart(2, "0")}
                  onUp={() => stepHour(1)}
                  onDown={() => stepHour(-1)}
                />
                <span className="text-[11px] font-semibold text-slate-300">:</span>
                <CompactStepper
                  label="minute"
                  value={String(minute).padStart(2, "0")}
                  onUp={() => stepMinute(1)}
                  onDown={() => stepMinute(-1)}
                />
                <div className="inline-flex shrink-0 rounded-[7px] bg-slate-100/90 p-0.5">
                  {(["AM", "PM"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyTime({ period: p })}
                      className={cn(
                        "h-6 min-w-[1.85rem] rounded-[6px] px-1.5 text-[10px] font-semibold transition-all",
                        period === p
                          ? "bg-[#006699] text-white shadow-sm"
                          : "text-slate-500 hover:text-[#006699]"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange?.(undefined)
                  setIsOpen(false)
                }}
                className="h-7 px-2 rounded-[7px] text-[10px] font-medium text-slate-500 hover:text-slate-700"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 px-3 rounded-[7px] text-[10px] font-semibold bg-[#006699] hover:bg-[#005580] text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>,
        getPortalTarget()
      )
    : null

  return (
    <div ref={rootRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        className={cn(
          "w-full h-10 justify-start text-left font-medium rounded-[8px] bg-white text-xs transition-all text-slate-800 hover:bg-[#f8fbfd] hover:border-[#006699]/35 focus-visible:ring-2 focus-visible:ring-[#006699]/15 border shadow-none",
          !className?.includes("border-") && "border-slate-200/80",
          !date && "text-slate-400",
          isOpen && "border-[#006699]/40 ring-2 ring-[#006699]/10",
          className
        )}
      >
        <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#e8f3f8] text-[#006699]">
          <CalendarIcon className="h-3.5 w-3.5" />
        </span>
        {date ? (
          <span className="truncate">
            {format(date, hideTime ? "MMM dd, yyyy" : "MMM dd, yyyy h:mm a")}
          </span>
        ) : (
          <span className="truncate">{displayPlaceholder}</span>
        )}
      </Button>
      {panel}
    </div>
  )
}
