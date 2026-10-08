import * as React from "react"
import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { apiService } from "@/services/apiService"
import { sortByLabel } from "@/lib/sortOptions"

export interface BusinessEntityContactResponse {
  businessEntityContactPersonDetailNo: number;
  businessEntityNo: number;
  contactPersonName: string;
  email: string;
  department: string;
  designation: string;
  businessEntityName: string;
  code: string;
  businessEntityTypeName: string;
}

interface BusinessEntityComboboxProps {
  value: string | undefined
  onChange: (contact: BusinessEntityContactResponse) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  detailNo?: number | null
  error?: boolean
  onResolve?: (entity: any) => void
  modal?: boolean
}

export function BusinessEntityCombobox({
  value,
  onChange,
  placeholder = "Select contact...",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  detailNo,
  error = false,
  onResolve,
  modal = false,
}: BusinessEntityComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<BusinessEntityContactResponse[]>([])
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
    if (detailNo && !isInitialized.current) {
      setIsLoading(true);
      apiService.get<any>(`/api/master/business-entities/contact-persons?BusinessEntityContactPersonDetailNo=${detailNo}`)
        .then(response => {
          const data = response?.data || response;
          const match = Array.isArray(data) ? data[0] : data;
          if (match && match.contactPersonName) {
            setSelectedLabel(match.contactPersonName);
            if (onResolve) onResolve(match);
            setOptions([match]);
          }
          isInitialized.current = true;
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
      return;
    }

    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel);
      isInitialized.current = true;
      return;
    }

    if (value) {
      const matchedInOptions = optionsRef.current.find(e => e.contactPersonName === value);
      if (matchedInOptions) {
        setSelectedLabel(matchedInOptions.contactPersonName);
        if (onResolve) onResolve(matchedInOptions);
        isInitialized.current = true;
        return;
      }
      // If we don't find it but have a value, just display the value
      setSelectedLabel(value);
    } else {
      setSelectedLabel("");
    }
    isInitialized.current = true;
  }, [value, initialLabel]);

  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.get<any>(`/api/master/business-entities/contact-persons?KeywordSearch=${search}`);
        if (active) {
          if (response && response.data) {
            setOptions(response.data);
          } else if (Array.isArray(response)) {
            setOptions(response);
          }
        }
      } catch (err) {
        console.error("Failed to search business entities:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (search === "") {
      fetchContacts();
    } else {
      const timer = setTimeout(fetchContacts, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open])

  const sortedContacts = React.useMemo(
    () =>
      sortByLabel(options, {
        getLabel: (c) => c.contactPersonName || '',
        getValue: (c) => String(c.businessEntityContactPersonDetailNo),
      }),
    [options]
  )

  return (
    <CrmSearchSelect<BusinessEntityContactResponse>
      items={sortedContacts}
      getKey={(c) => String(c.businessEntityContactPersonDetailNo)}
      getLabel={(c) => c.contactPersonName || ''}
      // The field value is the contact name.
      selectedKeys={sortedContacts.filter((c) => value && c.contactPersonName === value).map((c) => String(c.businessEntityContactPersonDetailNo))}
      onSelect={(contact) => {
        onChange(contact)
        setSelectedLabel(contact.contactPersonName)
      }}
      onClear={() =>
        onChange({ businessEntityContactPersonDetailNo: 0, businessEntityNo: 0, contactPersonName: "", email: "", department: "", designation: "", businessEntityName: "", code: "", businessEntityTypeName: "" } as any)
      }
      clearable={isClearable && Boolean(value)}
      displayLabel={selectedLabel}
      placeholder={placeholder}
      emptyText="No data found."
      disabled={disabled}
      invalid={error}
      onQueryChange={setSearch}
      serverSearch
      loading={isLoading}
      loadingText="Searching contacts…"
      onOpenChange={setOpen}
      className={cn(!className?.includes("h-") && "h-9", className)}
      modal={modal}
      header={
        <div className="grid grid-cols-5 gap-2 border-b border-[#EEF2F6] bg-[#F1F5F9] px-3 py-2 text-[11px] font-bold text-[#4a5d82] dark:border-[var(--tm-border)] dark:bg-[var(--tm-elevated)] dark:text-slate-400">
          <div>Contact Name</div>
          <div>Designation</div>
          <div>Business Entity</div>
          <div>Department</div>
          <div>Email</div>
        </div>
      }
      renderOption={(contact) => (
        <div className="grid grid-cols-5 items-center gap-2 text-xs">
          <div className="truncate font-semibold text-[#0c1a3a] dark:text-slate-100">{contact.contactPersonName}</div>
          <div className="truncate text-[#4a5d82] dark:text-slate-300">{contact.designation || '-'}</div>
          <div className="truncate text-[#4a5d82] dark:text-slate-300">{contact.businessEntityName || '-'}</div>
          <div className="truncate text-[#4a5d82] dark:text-slate-300">{contact.department || '-'}</div>
          <div className="truncate text-[#7a8494]">{contact.email || '-'}</div>
        </div>
      )}
    />
  )
}
