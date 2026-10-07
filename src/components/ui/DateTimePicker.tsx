import React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  DATE_TIME_FORMAT_12H,
  TIME_FORMAT,
  TIME_FORMAT_12H,
} from "@/lib/dateTime"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface DateTimePickerProps {
  date?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  hideTime?: boolean
  /** When true (default), time uses 24-hour clock (HH:mm) with no AM/PM. */
  hour24?: boolean
  /** When true, automatically selects today's date when opening the picker if no date is set. */
  autoSelectTodayOnOpen?: boolean
}

const MINUTES = [0, 15, 30, 45]

function CompactStepper({
  label,
  value,
  onUp,
  onDown,
  onChange,
  max,
}: {
  label: string
  value: string
  onUp: () => void
  onDown: () => void
  onChange?: (val: string) => void
  max?: number
}) {
  const [localValue, setLocalValue] = React.useState(value)
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(value)
    }
  }, [value, isFocused])

  return (
    <div className="inline-flex shrink-0 items-center rounded-md border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm focus-within:ring-1 focus-within:ring-brand focus-within:border-brand">
      <button
        type="button"
        onClick={onDown}
        className="h-7 w-6 shrink-0 inline-flex items-center justify-center rounded-l-[6px] text-slate-500 hover:bg-[var(--tm-tint)] hover:text-brand transition-colors"
        aria-label={`Decrease ${label}`}
      >
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={isFocused ? localValue : value}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onChange={(e) => {
          let val = e.target.value.replace(/\D/g, "");
          if (val.length > 2) val = val.slice(-2);
          if (max !== undefined && val !== "") {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed > max) {
              val = String(max).padStart(2, '0');
            }
          }
          setLocalValue(val);
          onChange?.(val);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          let finalVal = e.target.value.replace(/\D/g, "");
          if (finalVal.length === 1) {
            finalVal = finalVal.padStart(2, '0');
            setLocalValue(finalVal);
            onChange?.(finalVal);
          } else if (finalVal === "") {
            finalVal = "00";
            setLocalValue(finalVal);
            onChange?.(finalVal);
          }
        }}
        className="h-7 w-7 min-w-[1.6rem] bg-transparent p-0 text-center text-[12px] font-semibold tabular-nums text-slate-100 focus:outline-none focus:ring-0"
        aria-label={label}
      />
      <button
        type="button"
        onClick={onUp}
        className="h-7 w-6 shrink-0 inline-flex items-center justify-center rounded-r-[6px] text-slate-500 hover:bg-[var(--tm-tint)] hover:text-brand transition-colors"
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
  hour24 = true,
  autoSelectTodayOnOpen = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})
  const defaultPlaceholder = hideTime ? "Pick a date" : "Pick a date and time"
  const displayPlaceholder = placeholder || defaultPlaceholder

  const hour12 = date ? (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) : 12
  const hour24Value = date ? date.getHours() : 0
  const minute = date ? date.getMinutes() : 0
  const period = date && date.getHours() >= 12 ? "PM" : "AM"

  const displayFormat = hideTime
    ? DATE_FORMAT
    : hour24
      ? DATE_TIME_FORMAT
      : DATE_TIME_FORMAT_12H
  const panelTitleFormat = hideTime
    ? DATE_FORMAT
    : hour24
      ? `EEE, ${DATE_FORMAT} · ${TIME_FORMAT}`
      : `EEE, ${DATE_FORMAT} · ${TIME_FORMAT_12H}`

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

  const applyTime = (next: {
    hour12?: number
    hour24?: number
    minute?: number
    period?: "AM" | "PM"
  }) => {
    const base = date ? new Date(date) : new Date()
    if (!date) base.setSeconds(0, 0)
    const m = next.minute ?? minute

    let hrs: number
    if (hour24) {
      hrs = next.hour24 ?? hour24Value
      if (hrs < 0) hrs = 23
      if (hrs > 23) hrs = 0
    } else {
      const h12 = next.hour12 ?? hour12
      const p = next.period ?? period
      hrs = h12
      if (p === "PM" && hrs < 12) hrs += 12
      if (p === "AM" && hrs === 12) hrs = 0
    }

    base.setHours(hrs, m, 0, 0)
    onChange?.(base)
  }

  const stepHour = (delta: number) => {
    if (hour24) {
      let next = hour24Value + delta
      if (next > 23) next = 0
      if (next < 0) next = 23
      applyTime({ hour24: next })
      return
    }
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

  const resolveDefaultHours = () => {
    if (hour24) return hour24Value
    return period === "PM" && hour12 < 12
      ? hour12 + 12
      : hour12 === 12 && period === "AM"
        ? 0
        : hour12
  }

  const panel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          data-datetime-picker-panel=""
          style={panelStyle}
          className="rounded-[12px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] shadow-[0_18px_40px_-16px_rgba(15,23,42,0.35)] overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="false"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
            <p className="text-[11px] font-semibold text-slate-100 truncate">
              {date
                ? format(date, panelTitleFormat)
                : hideTime
                  ? "Select date"
                  : "Select date & time"}
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-5 w-5 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-surface)] transition-colors shrink-0"
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
                    selectedDate.setHours(resolveDefaultHours(), minute, 0, 0)
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
                caption_label: "text-[12px] font-semibold text-slate-100",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                button_previous:
                  "size-6 rounded-full text-slate-500 hover:bg-[var(--tm-tint)] hover:text-brand z-10",
                button_next:
                  "size-6 rounded-full text-slate-500 hover:bg-[var(--tm-tint)] hover:text-brand z-10",
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
                      "hover:bg-[var(--tm-tint)] hover:text-brand",
                      modifiers.outside && "text-slate-300",
                      modifiers.today &&
                        !modifiers.selected &&
                        "bg-[var(--tm-tint)] text-brand font-semibold",
                      modifiers.selected &&
                        "bg-brand text-white hover:bg-brand-hover hover:text-white font-semibold"
                    )}
                  />
                ),
              }}
            />
          </div>

          {/* Compact time + actions in one row */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--tm-border)] bg-[var(--tm-elevated)] px-2 py-1.5">
            {!hideTime && (
              <div className="flex items-center gap-1.5 shrink-0">
                <CompactStepper
                  label="hour"
                  value={String(hour24 ? hour24Value : hour12).padStart(2, "0")}
                  onUp={() => stepHour(1)}
                  onDown={() => stepHour(-1)}
                  max={hour24 ? 23 : 12}
                  onChange={(val) => {
                    const h = parseInt(val, 10);
                    if (!isNaN(h)) {
                      let nextH = h;
                      if (hour24) {
                        if (nextH > 23) nextH = 23;
                        applyTime({ hour24: nextH });
                      } else {
                        if (nextH > 12) nextH = 12;
                        applyTime({ hour12: nextH === 0 ? 12 : nextH });
                      }
                    }
                  }}
                />
                <span className="text-[11px] font-semibold text-slate-300">:</span>
                <CompactStepper
                  label="minute"
                  value={String(minute).padStart(2, "0")}
                  onUp={() => stepMinute(1)}
                  onDown={() => stepMinute(-1)}
                  max={59}
                  onChange={(val) => {
                    let m = parseInt(val, 10);
                    if (!isNaN(m)) {
                      if (m > 59) m = 59;
                      applyTime({ minute: m });
                    }
                  }}
                />
                {!hour24 && (
                  <div className="inline-flex shrink-0 rounded-[7px] bg-[var(--tm-muted)]/90 p-0.5">
                    {(["AM", "PM"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyTime({ period: p })}
                        className={cn(
                          "h-6 min-w-[1.85rem] rounded-[6px] px-1.5 text-[10px] font-semibold transition-all",
                          period === p
                            ? "bg-brand text-white shadow-sm"
                            : "text-slate-500 hover:text-brand"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
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
                className="h-7 px-2 rounded-[7px] text-[10px] font-medium text-slate-500 hover:text-slate-200"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 px-3 rounded-[7px] text-[10px] font-semibold bg-brand hover:bg-brand-hover text-white"
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
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => {
              const next = !open
              if (next && !date && autoSelectTodayOnOpen) {
                const now = new Date()
                now.setHours(resolveDefaultHours(), 0, 0, 0)
                onChange?.(now)
              }
              return next
            })
          }
        }}
        className={cn(
          "w-full h-10 justify-start text-left font-medium bg-[var(--tm-surface)] text-xs transition-all text-slate-100 hover:bg-[var(--tm-elevated)] hover:border-brand/35 focus-visible:ring-2 focus-visible:ring-brand/15 border shadow-tm-control",
          !date && "text-slate-400",
          isOpen && "border-brand/40 ring-2 ring-brand/10",
          className,
          "rounded-md border-[var(--tm-border)]",
          isOpen && "border-brand/40"
        )}
      >
        <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tm-tint)] text-brand">
          <CalendarIcon className="h-3.5 w-3.5" />
        </span>
        {date ? (
          <span className="truncate">{format(date, displayFormat)}</span>
        ) : (
          <span className="truncate">{displayPlaceholder}</span>
        )}
      </Button>
      {panel}
    </div>
  )
}
