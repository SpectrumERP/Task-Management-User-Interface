import * as React from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { getContrastColor } from "@/lib/colorUtils"
import { sortByLabel } from "@/lib/sortOptions"

interface ComboboxOption {
  label: string
  value: string
  colorCoding?: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  /** Kept for callers; the CRM field searches inline (placeholder shows while typing). */
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isClearable?: boolean
  onAddNew?: () => void
  addNewLabel?: string
  modal?: boolean
  onSearchChange?: (search: string) => void
  shouldFilter?: boolean
  /**
   * Sort options A–Z by label (default true).
   * Set false for workflow, rank, frequency, chronology, or fixed UX order.
   */
  sortAlphabetically?: boolean
  /** Option values kept at the top before A–Z sort (e.g. "none"). */
  pinValues?: string[]
  /** Extra classes for the dropdown panel (e.g. min-w for long labels). */
  contentClassName?: string
  /** Its options are on their way: a skeleton bar in the field (it keeps its size). */
  optionsLoading?: boolean
}

function ColorChip({ option }: { option: ComboboxOption }) {
  return (
    <span
      className="inline-flex w-fit max-w-full items-center self-start truncate rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: option.colorCoding, color: getContrastColor(option.colorCoding!) }}
    >
      {option.label}
    </span>
  )
}

const hasColor = (option?: ComboboxOption) => Boolean(option?.colorCoding && option.colorCoding !== "none")

/** Searchable single-select — Spectrum CRM dropdown search (see CrmSearchSelect). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  className,
  disabled = false,
  isClearable = true,
  onAddNew,
  addNewLabel = "Add New",
  modal = false,
  onSearchChange,
  shouldFilter = true,
  sortAlphabetically = true,
  pinValues,
  contentClassName,
  optionsLoading = false,
}: ComboboxProps) {
  const sortedOptions = React.useMemo(
    () => sortByLabel(options, { enabled: sortAlphabetically, pinValues }),
    [options, sortAlphabetically, pinValues]
  )
  const selectedOption = options.find((option) => option.value === value)

  return (
    <CrmSearchSelect<ComboboxOption>
      items={sortedOptions}
      getKey={(o) => o.value}
      getLabel={(o) => o.label}
      getSearchText={(o) => o.description ?? ""}
      selectedKeys={value ? [value] : []}
      // Picking the selected option again clears it (as before).
      onSelect={(o) => onChange(o.value === value ? "" : o.value)}
      onClear={() => onChange("")}
      clearable={isClearable}
      displayLabel={selectedOption?.label ?? ""}
      renderValue={hasColor(selectedOption) ? <ColorChip option={selectedOption!} /> : undefined}
      renderOption={(o, selected) => (
        <span className="flex min-w-0 flex-col">
          {hasColor(o) ? (
            <ColorChip option={o} />
          ) : (
            <span className={cn("truncate text-xs font-semibold", selected ? "text-[#1E56A0] dark:text-[#4f86d1]" : "text-[#0c1a3a] dark:text-slate-100")}>
              {o.label}
            </span>
          )}
          {o.description ? <span className="mt-0.5 truncate text-[11px] text-[#7a8494]">{o.description}</span> : null}
        </span>
      )}
      placeholder={placeholder}
      emptyText={emptyMessage}
      disabled={disabled}
      onQueryChange={onSearchChange}
      serverSearch={!shouldFilter}
      className={className}
      contentClassName={contentClassName}
      valueLoading={optionsLoading}
      modal={modal}
      footer={
        onAddNew ? (close) => (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              close()
              setTimeout(onAddNew, 0)
            }}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-bold text-[#1E56A0] hover:bg-[#eef3fc] dark:text-[#4f86d1] dark:hover:bg-[var(--tm-muted)]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            {addNewLabel}
          </button>
        ) : undefined
      }
    />
  )
}
