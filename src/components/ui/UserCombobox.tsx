import * as React from "react"
import { cn } from "@/lib/utils"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { userService, UserResponse } from "@/services/userService"
import { useAuthStore } from "@/store/useAuthStore"
import { sortByLabel } from "@/lib/sortOptions"

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
    user.loginId?.trim() && user.loginId.trim() !== primary ? user.loginId.trim() : "—"
  const email = user.email?.trim() || "—"

  return (
    <div className="grid grid-cols-[2fr_1.5fr_2fr] gap-3 min-w-0 flex-1">
      <div className="truncate font-semibold text-slate-100" title={primary}>{primary}</div>
      <div className="truncate text-slate-400" title={loginId}>{loginId}</div>
      <div className="truncate text-slate-500" title={email}>{email}</div>
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

  const sortedUsers = React.useMemo(
    () =>
      sortByLabel(options, {
        getLabel: (u) => u.printingName || u.loginId || '',
        getValue: (u) => String(u.loginNo),
      }),
    [options]
  )

  return (
    <CrmSearchSelect<UserResponse>
      items={sortedUsers}
      getKey={(u) => String(u.loginNo)}
      getLabel={(u) => u.printingName || u.loginId || ''}
      selectedKeys={value ? [String(value)] : []}
      onSelect={(user) => {
        onChange(user)
        setSelectedLabel(user.printingName)
      }}
      onClear={() => {
        onChange({ loginNo: "", printingName: "" } as any)
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
      loadingText="Searching users…"
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
      className={cn(!className?.includes("h-") && "h-9", className)}
      modal={modal}
      header={
        <div className="border-b border-[#EEF2F6] bg-[#F1F5F9] px-3 py-2 text-[11px] font-bold text-[#4a5d82] dark:border-[var(--tm-border)] dark:bg-[var(--tm-elevated)] dark:text-slate-400">
          <div className="grid grid-cols-[2fr_1.5fr_2fr] gap-3">
            <div>User Name</div>
            <div>Login ID</div>
            <div>Email</div>
          </div>
        </div>
      }
      renderOption={(user) => <UserOptionLine user={user} />}
    />
  )
}
