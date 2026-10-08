import * as React from "react"

import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { sortByLabel } from "@/lib/sortOptions"

interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Kept for callers; the CRM field searches inline. */
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isClearable?: boolean
  modal?: boolean
  /** Kept for callers; the CRM field shows "N selected" instead of chips. */
  maxVisible?: number
  /** Sort options A–Z by label (default true). */
  sortAlphabetically?: boolean
  pinValues?: string[]
}

/** CRM multi-select label: the one value, "N selected", or the placeholder. */
export function multiSelectLabel(labels: string[]) {
  if (labels.length === 0) return ""
  if (labels.length === 1) return labels[0]
  return `${labels.length} selected`
}

/** Multi-select with inline search — Spectrum CRM dropdown (checkbox rows, Clear in the footer). */
export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options...",
  emptyMessage = "No option found.",
  className,
  disabled = false,
  isClearable = true,
  modal = false,
  sortAlphabetically = true,
  pinValues,
}: MultiSelectProps) {
  const sorted = React.useMemo(
    () => sortByLabel(options, { enabled: sortAlphabetically, pinValues }),
    [options, sortAlphabetically, pinValues]
  )
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)

  return (
    <CrmSearchSelect<MultiSelectOption>
      multiple
      items={sorted}
      getKey={(o) => o.value}
      getLabel={(o) => o.label}
      selectedKeys={value}
      onSelect={(o) =>
        onChange(value.includes(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value])
      }
      onClear={() => onChange([])}
      clearable={isClearable}
      displayLabel={multiSelectLabel(selectedLabels)}
      placeholder={placeholder}
      emptyText={emptyMessage}
      disabled={disabled}
      className={className}
      modal={modal}
      footer={
        value.length > 0
          ? () => (
              <div className="px-3 py-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange([])}
                  className="text-xs font-semibold text-[#c41e1e] hover:underline"
                >
                  Clear
                </button>
              </div>
            )
          : undefined
      }
    />
  )
}
