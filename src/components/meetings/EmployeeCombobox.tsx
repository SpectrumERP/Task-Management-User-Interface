import * as React from "react"
import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { apiService } from "@/services/apiService"
import { sortByLabel } from "@/lib/sortOptions"

export interface EmployeeResponse {
  empNo: number;
  empCode: string;
  empName: string;
}

interface EmployeeComboboxProps {
  value: string | undefined
  onChange: (emp: EmployeeResponse) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  error?: boolean
  onResolve?: (employee: any) => void
  modal?: boolean
}

export function EmployeeCombobox({
  value,
  onChange,
  placeholder = "Search employee...",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
  onResolve,
  modal = false,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<EmployeeResponse[]>([])
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")

  const isInitialized = React.useRef(false);
  const lastInitialLabelRef = React.useRef(initialLabel);
  const optionsRef = React.useRef(options);

  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "");
      lastInitialLabelRef.current = initialLabel;
      isInitialized.current = false;
    }
  }, [initialLabel]);

  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel);
      isInitialized.current = true;
      return;
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find(e => e.empNo.toString() === value);
      if (matchedInOptions) {
        setSelectedLabel(matchedInOptions.empName);
        if (onResolve) onResolve(matchedInOptions);
        isInitialized.current = true;
        return;
      } else if (!isInitialized.current) {
        // Fetch specific employee by empNo to populate the initial label
        apiService.get<any>(`/api/payroll/employees?empNo=${value}`)
          .then(res => {
            const data = res?.data || res;
            if (Array.isArray(data) && data.length > 0) {
              // Usually the backend might return an array, or if it returns single object, wrap it
              const emp = data[0];
              setSelectedLabel(emp.empName);
              if (onResolve) onResolve(emp);
              setOptions(data);
            }
          })
          .catch(err => console.error("Failed to fetch initial employee:", err))
          .finally(() => {
            isInitialized.current = true;
          });
        return;
      }
    } else {
      setSelectedLabel("");
    }
    isInitialized.current = true;
  }, [value, initialLabel]);

  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.get<any>(`/api/payroll/employees?keywordSearch=${search}`);
        if (active) {
          if (response && response.data) {
            setOptions(response.data);
          } else if (Array.isArray(response)) {
            setOptions(response);
          }
        }
      } catch (err) {
        console.error("Failed to search employees:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (search === "") {
      fetchEmployees();
    } else {
      const timer = setTimeout(fetchEmployees, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open])

  const sortedEmployees = React.useMemo(
    () =>
      sortByLabel(options, {
        getLabel: (emp) => emp.empName || emp.empCode || '',
        getValue: (emp) => String(emp.empNo),
      }),
    [options]
  )

  return (
    <CrmSearchSelect<EmployeeResponse>
      items={sortedEmployees}
      getKey={(emp) => String(emp.empNo)}
      getLabel={(emp) => emp.empName || emp.empCode || ''}
      getSearchText={(emp) => emp.empCode || ''}
      selectedKeys={value ? [String(value)] : []}
      onSelect={(emp) => {
        onChange(emp)
        setSelectedLabel(emp.empName)
      }}
      onClear={() => onChange({ empNo: 0, empCode: "", empName: "" } as any)}
      clearable={isClearable}
      displayLabel={selectedLabel}
      placeholder={placeholder}
      emptyText="No data found."
      disabled={disabled}
      invalid={error}
      onQueryChange={setSearch}
      serverSearch
      loading={isLoading}
      loadingText="Searching employees…"
      onOpenChange={setOpen}
      className={cn(!className?.includes("h-") && "h-9", className)}
      modal={modal}
      header={
        <div className="grid grid-cols-2 gap-2 border-b border-[#EEF2F6] bg-[#F1F5F9] px-3 py-2 text-[11px] font-bold text-[#4a5d82] dark:border-[var(--tm-border)] dark:bg-[var(--tm-elevated)] dark:text-slate-400">
          <div>Employee Name</div>
          <div>Employee Code</div>
        </div>
      }
      renderOption={(emp) => (
        <div className="grid grid-cols-2 items-center gap-2 text-xs">
          <div className="truncate font-semibold text-[#0c1a3a] dark:text-slate-100">{emp.empName}</div>
          <div className="truncate text-[#4a5d82] dark:text-slate-300">{emp.empCode}</div>
        </div>
      )}
    />
  )
}
