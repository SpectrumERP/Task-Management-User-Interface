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
  onResolve?: (user: UserResponse) => void
  modal?: boolean
}

export function UserOptionLine({ user }: { user: UserResponse }) {
  const primary = user.printingName?.trim() || user.loginId?.trim() || "—"
  const loginId =
    user.loginId?.trim() && user.loginId.trim() !== primary ? user.loginId.trim() : null
  const email = user.email?.trim() || null

  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="truncate font-semibold text-slate-100">{primary}</span>
        {loginId ? (
          <>
            <span className="shrink-0 text-slate-600" aria-hidden>
              ·
            </span>
            <span className="truncate text-slate-400">{loginId}</span>
          </>
        ) : null}
        {email ? (
          <>
            <span className="shrink-0 text-slate-600" aria-hidden>
              ·
            </span>
            <span className="truncate text-slate-500">{email}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export const userItemClassName =
  "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer aria-selected:bg-[#0EA5E9]/12 data-[selected=true]:bg-[#0EA5E9]/12 data-[selected=true]:text-slate-50 hover:bg-[var(--tm-muted)]/80"

export function UserCombobox({
  value,
  onChange,
  placeholder = "Search user...",
  className,
  disabled = false,
  initialLabel,
  isClearable = true,
  error = false,
  onResolve,
  modal = false,
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [options, setOptions] = React.useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (open) {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs.length > 0) {
        setContainer(dialogs[dialogs.length - 1] as HTMLElement)
      } else {
        setContainer(null)
      }
    }
  }, [open])

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
        if (onResolve) onResolve(matchedInOptions);
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
            if (onResolve) onResolve(matched);
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

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between transition-all border shadow-sm relative pr-8",
            "disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-[var(--tm-elevated)] disabled:hover:bg-[var(--tm-elevated)]",
            !className?.includes("text-") && "text-sm font-medium text-slate-50",
            !className?.includes("h-") && "h-9",
            className,
            "rounded-[8px]",
            error ? "!border-red-500 text-red-500" : "!border-[var(--tm-border)]"
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
                className="p-0.5 rounded-full hover:bg-[var(--tm-muted)] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal container={container || document.body}>
        <PopoverPrimitive.Content
          className="z-[100] w-[min(92vw,380px)] p-0 rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] text-popover-foreground shadow-[0_16px_40px_-12px_rgba(15,23,42,0.45)] outline-none pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            requestAnimationFrame(() => searchInputRef.current?.focus())
          }}
        >
          <Command className="rounded-xl border-0 bg-transparent" shouldFilter={false}>
            <div className="border-b border-[var(--tm-border)] bg-[var(--tm-muted)]/50">
              <CommandInput
                ref={searchInputRef}
                value={search}
                placeholder="Type to search..."
                className="h-10 border-none focus:ring-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500"
                onValueChange={setSearch}
              />
            </div>

            <CommandList className="max-h-72 overflow-y-auto p-1.5 scrollbar-hide">
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
                  {[...options]
                    .sort((a, b) => {
                      const al = (a.printingName || a.loginId || '').toLowerCase()
                      const bl = (b.printingName || b.loginId || '').toLowerCase()
                      return al.localeCompare(bl, undefined, { sensitivity: 'base', numeric: true })
                    })
                    .map((user) => {
                    const isSelected = value === user.loginNo.toString()
                    return (
                      <CommandItem
                        key={user.loginNo}
                        value={`${user.loginId} ${user.printingName} ${user.email}`}
                        onSelect={() => {
                          onChange(user)
                          setSelectedLabel(user.printingName)
                          setOpen(false)
                        }}
                        className={cn(userItemClassName, isSelected && "bg-[#0EA5E9]/10 ring-1 ring-[#0EA5E9]/25")}
                      >
                        <UserOptionLine user={user} />
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 text-[#0EA5E9]",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
