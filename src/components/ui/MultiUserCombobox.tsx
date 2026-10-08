import * as React from "react"
import { CrmSearchSelect } from "@/components/ui/CrmSearchSelect"
import { userService, UserResponse } from "@/services/userService"
import { UserOptionLine } from "@/components/ui/UserCombobox"
import { sortByLabel } from "@/lib/sortOptions"

interface MultiUserComboboxProps {
  value: string[]
  onChange: (userIds: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  modal?: boolean
}

export function MultiUserCombobox({
  value = [],
  onChange,
  className,
  disabled = false,
  modal = false,
}: MultiUserComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)


  // Fetch users when combobox is opened
  React.useEffect(() => {
    if (open && options.length === 0) {
      setIsLoading(true)
      userService.searchUsers('')
        .then(res => {
          setOptions(res)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, options.length])

  // Search dynamically when search keyword changes
  React.useEffect(() => {
    if (!open || search.trim() === '') return;

    const delayDebounceFn = setTimeout(() => {
      setIsLoading(true)
      userService.searchUsers(search)
        .then(res => {
          // Merge with existing options avoiding duplicates
          const newOptions = [...options];
          res.forEach(newUser => {
            if (!newOptions.find(o => o.loginNo === newUser.loginNo)) {
              newOptions.push(newUser);
            }
          });
          setOptions(newOptions);
        })
        .finally(() => setIsLoading(false))
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [search, open])

  const toggleUser = (loginNoStr: string) => {
    if (value.includes(loginNoStr)) {
      onChange(value.filter(id => id !== loginNoStr));
    } else {
      onChange([...value, loginNoStr]);
    }
  };

  const handleSelectAll = () => {
    onChange(['All']);
  }

  const isAllSelected = value.includes('All') || value.length === 0;

  const ALL_KEY = 'All'
  const items = React.useMemo(
    () => [
      { loginNo: ALL_KEY, printingName: 'All Users' } as unknown as UserResponse,
      ...sortByLabel(options, {
        getLabel: (u) => u.printingName || u.loginId || '',
        getValue: (u) => String(u.loginNo),
      }),
    ],
    [options]
  )

  return (
    <CrmSearchSelect<UserResponse>
      multiple
      items={items}
      getKey={(u) => String(u.loginNo)}
      getLabel={(u) => u.printingName || u.loginId || ''}
      getSearchText={(u) => `${u.loginId ?? ''} ${u.email ?? ''}`}
      selectedKeys={isAllSelected ? [ALL_KEY] : value}
      onSelect={(user) => {
        const id = String(user.loginNo)
        if (id === ALL_KEY) handleSelectAll()
        else if (isAllSelected) onChange([id])
        else toggleUser(id)
      }}
      onClear={() => onChange([])}
      clearable={!isAllSelected}
      displayLabel={isAllSelected ? 'All Users' : `${value.length} user${value.length > 1 ? 's' : ''} selected`}
      placeholder="Search user..."
      emptyText="No data found."
      disabled={disabled}
      onQueryChange={setSearch}
      serverSearch
      loading={isLoading}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
      className={className ?? "h-9"}
      modal={modal}
      header={
        <div className="border-b border-[#EEF2F6] bg-[#F1F5F9] px-3 py-2 text-[11px] font-bold text-[#4a5d82] dark:border-[var(--tm-border)] dark:bg-[var(--tm-elevated)] dark:text-slate-400">
          <div className="grid grid-cols-[2fr_1.5fr_2fr] gap-3 pl-6">
            <div>User Name</div>
            <div>Login ID</div>
            <div>Email</div>
          </div>
        </div>
      }
      renderOption={(user) =>
        String(user.loginNo) === ALL_KEY ? (
          <span className="text-xs font-bold text-[#1E56A0] dark:text-[#4f86d1]">All Users</span>
        ) : (
          <UserOptionLine user={user} />
        )
      }
    />
  )
}
