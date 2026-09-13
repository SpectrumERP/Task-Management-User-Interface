import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import {
  Command,
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
import { UserOptionLine, userItemClassName } from "@/components/ui/UserCombobox"

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
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [options, setOptions] = React.useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const handleSelectAll = () => {
    onChange(['All']);
  }

  const isAllSelected = value.includes('All') || value.length === 0;

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
            "w-full justify-between font-normal bg-[var(--tm-surface)] h-9 rounded-[8px] border border-[var(--tm-border)]",
            !value.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {isAllSelected 
              ? 'All Users' 
              : `${value.length} user${value.length > 1 ? 's' : ''} selected`}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && !isAllSelected && (
              <div
                role="button"
                tabIndex={0}
                className="h-4 w-4 rounded-sm hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-200"
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal container={container || document.body}>
      <PopoverPrimitive.Content 
          className="z-[100] w-[min(92vw,380px)] p-0 rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] text-popover-foreground shadow-[0_16px_40px_-12px_rgba(15,23,42,0.45)] outline-none pointer-events-auto" 
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
              placeholder="Search user..."
              className="h-10 border-none focus:ring-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500"
              onValueChange={setSearch}
            />
          </div>

          <CommandList className="max-h-72 overflow-y-auto p-1.5 scrollbar-hide">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs font-medium">Searching...</span>
              </div>
            )}
            
            {!isLoading && (
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={handleSelectAll}
                  className={cn(userItemClassName, isAllSelected && "bg-[#0EA5E9]/10 ring-1 ring-[#0EA5E9]/25")}
                >
                  <span className="font-semibold text-[#0EA5E9]">All Users</span>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#0EA5E9]",
                      isAllSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>

                {options.map((user) => {
                  const isSelected = value.includes(user.loginNo.toString()) && !isAllSelected
                  return (
                    <CommandItem
                      key={user.loginNo}
                      value={`${user.loginId} ${user.printingName} ${user.email}`}
                      onSelect={() => {
                        if (isAllSelected) {
                          onChange([user.loginNo.toString()])
                        } else {
                          toggleUser(user.loginNo.toString())
                        }
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
