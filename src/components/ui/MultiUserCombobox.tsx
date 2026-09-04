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

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-white h-9 rounded-[8px] border border-[#a8afb7]",
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
                className="h-4 w-4 rounded-sm hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700"
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
          className="z-[100] w-[300px] sm:w-[400px] md:w-[500px] max-w-[90vw] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none pointer-events-auto" 
          align="start"
        >
        <Command className="rounded-xl border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50/50">
            <CommandInput
              placeholder="Search user..."
              className="h-10 border-none focus:ring-0 bg-transparent"
              onValueChange={setSearch}
            />
          </div>

          <CommandList className="max-h-72 scrollbar-hide">
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
                  className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                >
                  <div className="w-full flex items-center font-bold text-blue-600">
                    All Users
                  </div>
                  {isAllSelected && <Check className="h-3 w-3 text-[#006699] ml-2 shrink-0" />}
                </CommandItem>

                {options.map((user) => (
                  <CommandItem
                    key={user.loginNo}
                    value={`${user.loginId} ${user.printingName} ${user.email}`}
                    onSelect={() => {
                      // If 'All' was selected, clear it before selecting individual users
                      if (isAllSelected) {
                        onChange([user.loginNo.toString()]);
                      } else {
                        toggleUser(user.loginNo.toString());
                      }
                    }}
                    className="text-[11px] font-medium py-2 px-3 cursor-pointer"
                  >
                    <div className="grid grid-cols-3 w-full items-center gap-2">
                      <div className="truncate text-slate-900 font-bold">{user.loginId}</div>
                      <div className="truncate text-slate-600">{user.printingName}</div>
                      <div className="truncate text-slate-400 font-normal">{user.email || 'N/A'}</div>
                    </div>
                    {value.includes(user.loginNo.toString()) && !isAllSelected && (
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
