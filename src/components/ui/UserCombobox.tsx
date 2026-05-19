import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
}

export function UserCombobox({
  value,
  onChange,
  placeholder = "Search user...",
  className = "border-slate-300 shadow-sm",
  disabled = false,
  initialLabel
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel || "")
  
  const authUser = useAuthStore(state => state.user)
  const loginNo = authUser?.loginNo || 0

  // Handle initial label if value changes and we don't have a label
  React.useEffect(() => {
    if (initialLabel) {
      setSelectedLabel(initialLabel)
    }
  }, [initialLabel])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (open) {
        setIsLoading(true)
        const results = await userService.searchUsers(search, loginNo)
        setOptions(results)
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
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
            "w-full justify-between transition-all",
            !className?.includes("text-") && "text-[11px] font-bold text-slate-900",
            !className?.includes("rounded-") && "rounded-xl",
            !className?.includes("h-") && "h-9",
            className
          )}
        >
          <span className={cn("truncate", !selectedLabel && "text-slate-400 font-medium")}>{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-40 text-slate-400" />
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
