import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { locationService, LocationResponse, formatLocationDisplayLabel } from "@/services/locationService"
import { sortByLabel } from "@/lib/sortOptions"

interface LocationComboboxProps {
  value: string | undefined
  onChange: (location: LocationResponse) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  error?: boolean
  onResolve?: (location: LocationResponse) => void
  modal?: boolean
  onAddNew?: () => void
  addNewLabel?: string
}

export function LocationCombobox({
  value,
  onChange,
  placeholder = "Select location",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
  onResolve,
  modal = false,
  onAddNew,
  addNewLabel = "Add New",
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<LocationResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")


  const isInitialized = React.useRef(false)
  const lastInitialLabelRef = React.useRef(initialLabel)
  const optionsRef = React.useRef(options)

  React.useEffect(() => {
    optionsRef.current = options
  }, [options])

  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "")
      lastInitialLabelRef.current = initialLabel
      isInitialized.current = false
    }
  }, [initialLabel])

  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel)
      isInitialized.current = true
      return
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find((l) => l.operLocationNo.toString() === value)
      if (matchedInOptions) {
        setSelectedLabel(formatLocationDisplayLabel(matchedInOptions))
        if (onResolve) onResolve(matchedInOptions)
        isInitialized.current = true
        return
      }

      const resolveLocation = async () => {
        setIsLoading(true)
        try {
          const results = await locationService.searchLocations("")
          const matched = results.find((l) => l.operLocationNo.toString() === value)
          if (matched) {
            setSelectedLabel(formatLocationDisplayLabel(matched))
            if (onResolve) onResolve(matched)
          }
        } catch (err) {
          console.error("Failed to resolve location label:", err)
        } finally {
          setIsLoading(false)
        }
      }
      resolveLocation()
    } else {
      setSelectedLabel("")
    }
    isInitialized.current = true
  }, [value, initialLabel])

  React.useEffect(() => {
    if (!open) return

    let active = true

    const fetchLocations = async () => {
      setIsLoading(true)
      try {
        const results = await locationService.searchLocations(search)
        if (active) setOptions(results)
      } catch (err) {
        console.error("Failed to search locations:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (search === "") {
      fetchLocations()
    } else {
      const timer = setTimeout(fetchLocations, 300)
      return () => {
        active = false
        clearTimeout(timer)
      }
    }
  }, [search, open])

  const sortedLocations = React.useMemo(
    () =>
      sortByLabel(options, {
        getLabel: (loc) => formatLocationDisplayLabel(loc),
        getValue: (loc) => String(loc.operLocationNo),
      }),
    [options]
  )

  return (
    <CrmSearchSelect<LocationResponse>
      items={sortedLocations}
      getKey={(loc) => String(loc.operLocationNo)}
      getLabel={(loc) => loc.operLocationName || "—"}
      selectedKeys={value ? [String(value)] : []}
      onSelect={(location) => {
        onChange(location)
        setSelectedLabel(formatLocationDisplayLabel(location))
      }}
      onClear={() => {
        onChange({ operLocationNo: "" } as any)
        setSelectedLabel("")
      }}
      clearable={isClearable}
      displayLabel={selectedLabel}
      placeholder={placeholder}
      emptyText="No data found."
      disabled={disabled}
      invalid={error}
      onQueryChange={setSearch}
      serverSearch
      loading={isLoading}
      loadingText="Searching locations…"
      onOpenChange={setOpen}
      className={cn(!className?.includes("h-") && "h-9", className)}
      modal={modal}
      footer={
        onAddNew
          ? (close) => (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  close()
                  setTimeout(() => onAddNew?.(), 0)
                }}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-bold text-[#1E56A0] hover:bg-[#eef3fc] dark:text-[#4f86d1] dark:hover:bg-[var(--tm-muted)]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                {addNewLabel}
              </button>
            )
          : undefined
      }
    />
  )
}
