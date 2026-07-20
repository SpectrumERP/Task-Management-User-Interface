import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiService } from "@/services/apiService"

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

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between transition-all border shadow-sm relative pr-8",
            !className?.includes("border-") && "border-slate-300",
            !className?.includes("text-") && "text-sm font-medium text-slate-900",
            !className?.includes("rounded-") && "rounded-xl",
            !className?.includes("h-") && "h-9",
            className,
            error && "!border-red-500 text-red-500"
          )}
        >
          <span className={cn("truncate pr-2", !selectedLabel && "text-slate-400 font-medium", error && "text-red-500")}>{selectedLabel || placeholder}</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            {value && !disabled && isClearable && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ businessEntityContactPersonDetailNo: 0, businessEntityNo: 0, contactPersonName: "", email: "", department: "", designation: "", businessEntityName: "", code: "", businessEntityTypeName: "" } as any);
                }}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
        className="z-[100] w-[300px] sm:w-[500px] md:w-[600px] max-w-[90vw] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        align="start"
      >
        <Command className="rounded-xl border-slate-200" shouldFilter={false}>
          <div className="border-b border-slate-100 bg-slate-50/50">
            <CommandInput
              autoFocus
              placeholder="Type to search..."
              className="h-10 border-none focus:ring-0 bg-transparent"
              onValueChange={setSearch}
            />
          </div>

          <div className="grid grid-cols-5 px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <div>Contact Name</div>
            <div>Designation</div>
            <div>Business Entity</div>
            <div>Department</div>
            <div>Email</div>
          </div>

          <CommandList className="max-h-72 scrollbar-hide">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs font-medium">Searching contacts...</span>
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty className="py-8 text-center text-xs text-slate-500 font-medium">
                No data found.
              </CommandEmpty>
            )}
            {!isLoading && (
              <CommandGroup>
                {options.map((contact) => (
                  <CommandItem
                    key={contact.businessEntityContactPersonDetailNo}
                    value={`${contact.contactPersonName} ${contact.designation} ${contact.department} ${contact.email}`}
                    onSelect={() => {
                      onChange(contact)
                      setSelectedLabel(contact.contactPersonName)
                      setOpen(false)
                    }}
                    className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                  >
                    <div className="grid grid-cols-5 w-full items-center gap-2">
                      <div className="truncate text-slate-900 font-bold">{contact.contactPersonName}</div>
                      <div className="truncate text-slate-600">{contact.designation || '-'}</div>
                      <div className="truncate text-slate-600">{contact.businessEntityName || '-'}</div>
                      <div className="truncate text-slate-600">{contact.department || '-'}</div>
                      <div className="truncate text-slate-400">{contact.email || '-'}</div>
                    </div>
                    {value === contact.contactPersonName && (
                      <Check className="h-3 w-3 text-[#006699] ml-2 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
