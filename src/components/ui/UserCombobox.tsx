import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { userService, UserResponse } from "@/services/userService"
import { useAuthStore } from "@/store/useAuthStore"

interface UserComboboxProps {
  value: string | undefined
  onChange: (user: UserResponse) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  initialLabel?: string
  isClearable?: boolean
  error?: boolean
}

export function UserCombobox({
  value,
  onChange,
  placeholder = "Search user...",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")

  const authUser = useAuthStore(state => state.user)
  const loginNo = authUser?.loginNo || 0

  const isInitialized = React.useRef(false);
  const lastInitialLabelRef = React.useRef(initialLabel);
  const optionsRef = React.useRef(options);

  // Keep options ref updated without re-running effects
  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle dynamic initialLabel changes from the parent
  React.useEffect(() => {
    if (initialLabel !== lastInitialLabelRef.current) {
      setSelectedLabel(initialLabel || "");
      lastInitialLabelRef.current = initialLabel;
      isInitialized.current = false;
    }
  }, [initialLabel]);

  // Handle initial label and resolve user printing name if value changes
  React.useEffect(() => {
    if (initialLabel && !isInitialized.current) {
      setSelectedLabel(initialLabel);
      isInitialized.current = true;
      return;
    }

    if (value) {
      // 1. Check if it matches the authenticated user (instant check)
      const isAuthUser = authUser && (
        authUser.loginNo?.toString() === value ||
        authUser.LoginNo?.toString() === value ||
        authUser.id?.toString() === value
      );
      if (isAuthUser) {
        setSelectedLabel(authUser.PrintingName || authUser.printingName || authUser.name || authUser.loginId || '');
        isInitialized.current = true;
        return;
      }

      // 2. Try to find in the already loaded options list first (instant)
      const matchedInOptions = optionsRef.current.find(u => u.loginNo.toString() === value);
      if (matchedInOptions) {
        setSelectedLabel(matchedInOptions.printingName);
        isInitialized.current = true;
        return;
      }

      // 3. Fetch from the API if not found locally
      const resolveUser = async () => {
        setIsLoading(true);
        try {
          const results = await userService.searchUsers('', loginNo);
          let matched = results.find(u => u.loginNo.toString() === value);

          if (!matched) {
            const resultsA = await userService.searchUsers('a', loginNo);
            matched = resultsA.find(u => u.loginNo.toString() === value);
          }

          if (matched) {
            setSelectedLabel(matched.printingName);
          } else {
            if (authUser && (authUser.loginNo?.toString() === value || authUser.LoginNo?.toString() === value)) {
              setSelectedLabel(authUser.PrintingName || authUser.printingName || authUser.name || authUser.loginId || '');
            }
          }
        } catch (err) {
          console.error("Failed to resolve user label:", err);
        } finally {
          setIsLoading(false);
        }
      };
      resolveUser();
    } else {
      setSelectedLabel("");
    }
    isInitialized.current = true;
  }, [value, initialLabel, loginNo, authUser]);

  // Debounced search with immediate fetch on open
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const results = await userService.searchUsers(search, loginNo);
        if (active) {
          setOptions(results);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (search === "") {
      fetchUsers();
    } else {
      const timer = setTimeout(fetchUsers, 300);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [search, open, loginNo])

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                  onChange({ loginNo: "", printingName: "" } as any);
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
      <PopoverContent className="w-[300px] sm:w-[400px] md:w-[500px] max-w-[90vw] p-0 z-[9999]" align="start">
        <Command className="rounded-xl border-slate-200" shouldFilter={false}>
          <div className="border-b border-slate-100 bg-slate-50/50">
            <CommandInput
              placeholder="Type to search..."
              className="h-10 border-none focus:ring-0 bg-transparent"
              onValueChange={setSearch}
            />
          </div>

          <div className="grid grid-cols-3 px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <div>User Name</div>
            <div>Display Name</div>
            <div>Email</div>
          </div>

          <CommandList className="max-h-72 scrollbar-hide">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs font-medium">Searching users...</span>
              </div>
            )}
            {!isLoading && options.length === 0 && (
              <CommandEmpty className="py-8 text-center text-xs text-slate-500 font-medium">
                No data found.
              </CommandEmpty>
            )}
            {!isLoading && (
              <CommandGroup>
                {options.map((user) => (
                  <CommandItem
                    key={user.loginNo}
                    value={`${user.loginId} ${user.printingName} ${user.email}`}
                    onSelect={() => {
                      onChange(user)
                      setSelectedLabel(user.printingName)
                      setOpen(false)
                    }}
                    className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                  >
                    <div className="grid grid-cols-3 w-full items-center gap-2">
                      <div className="truncate text-slate-900 font-bold">{user.loginId}</div>
                      <div className="truncate text-slate-600">{user.printingName}</div>
                      <div className="truncate text-slate-400 font-normal">{user.email || 'N/A'}</div>
                    </div>
                    {value === user.loginNo.toString() && (
                      <Check className="h-3 w-3 text-[#006699] ml-2 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
