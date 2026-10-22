import * as React from 'react';
import { Users, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { userService, type UserResponse } from '@/services/userService';
import { getUserInitials } from '@/lib/userProfile';
import { sortByLabel } from '@/lib/sortOptions';
import { cn } from '@/lib/utils';

export interface UserChip {
  loginNo?: number | string;
  userName?: string;
  displayName?: string;
  email?: string;
  isFromTeam?: boolean;
}

interface UserChipsInputProps {
  users: UserChip[];
  onAdd: (user: UserResponse) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  ariaLabel?: string;
}

const MAX_SUGGESTIONS = 8;

/**
 * Outlook "To" style picker: selected users as chips (click one for its profile card, × to remove; team members only leave with their team),
 * then a search box whose suggestions show name and email.
 */
export function UserChipsInput({ users, onAdd, onRemove, placeholder = 'Type a name or email', invalid, id, ariaLabel }: UserChipsInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [options, setOptions] = React.useState<UserResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);

  // Search on focus (empty query = suggested contacts) and as the user types (debounced).
  React.useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const results = await userService.searchUsers(query.trim());
        if (!cancelled) setOptions(results);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setTimeout(run, query ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, focused]);

  const selected = React.useMemo(() => new Set(users.map((u) => String(u.loginNo ?? ''))), [users]);
  const suggestions = React.useMemo(
    () =>
      sortByLabel(
        options.filter((o) => !selected.has(String(o.loginNo))),
        { getLabel: (u) => u.printingName || u.loginId || '', getValue: (u) => String(u.loginNo) }
      ).slice(0, MAX_SUGGESTIONS),
    [options, selected]
  );

  // Highlighted suggestion, kept in range as the list shrinks.
  const activeIndex = Math.max(0, Math.min(active, suggestions.length - 1));

  const open = focused && (loading || suggestions.length > 0 || query.trim().length > 0);

  const pick = (user: UserResponse) => {
    onAdd(user);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      // Never submit the task form from here.
      e.preventDefault();
      if (suggestions[activeIndex]) pick(suggestions[activeIndex]);
    } else if (e.key === 'Backspace' && !query) {
      // Last chip you added yourself; team members stay.
      const last = users.map((u) => !u.isFromTeam).lastIndexOf(true);
      if (last >= 0) onRemove(last);
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div
          ref={boxRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) inputRef.current?.focus();
          }}
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-[8px] border bg-[var(--tm-surface)] px-2 py-1.5 cursor-text transition-colors',
            'border-[var(--tm-border)] focus-within:border-[#0EA5E9] focus-within:ring-2 focus-within:ring-[#0EA5E9]/15',
            invalid && 'border-red-400'
          )}
        >
          {users.map((u, index) => (
            <span
              key={`${u.loginNo ?? u.email ?? index}`}
              className={cn(
                'inline-flex max-w-full items-center gap-0.5 rounded-[6px] border border-[var(--tm-border)] bg-[var(--tm-muted)]/60 py-0.5 pl-1.5',
                u.isFromTeam ? 'pr-1.5' : 'pr-0.5'
              )}
              title={u.isFromTeam ? 'From team — clear the team to remove' : undefined}
            >
              {u.isFromTeam && (
                <Users size={11} className="shrink-0 text-[#0EA5E9]" aria-label="Added from team" />
              )}
              <UserAvatar
                loginNo={u.loginNo ? Number(u.loginNo) : null}
                displayName={u.displayName || u.userName}
                size="sm"
                showName
                className="-mx-0 px-0.5 py-0"
                nameClassName="text-[11px] font-medium text-slate-100 max-w-[11rem]"
              />
              {/* Team members leave with their team (clear it in the Team select), not one by one. */}
              {!u.isFromTeam && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  aria-label={`Remove ${u.displayName || u.userName || 'user'}`}
                  title="Remove"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <X size={12} strokeWidth={2.25} />
                </button>
              )}
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              // Keep the list open while the pointer is on it (it lives in a portal).
              const next = e.relatedTarget as Node | null;
              if (next && document.querySelector('[data-user-chips-list]')?.contains(next)) return;
              setFocused(false);
            }}
            onKeyDown={onKeyDown}
            placeholder={users.length ? '' : placeholder}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-autocomplete="list"
            className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        data-user-chips-list
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (boxRef.current?.contains(e.target as Node)) e.preventDefault();
          else setFocused(false);
        }}
        className="z-[9999] w-[min(24rem,var(--radix-popover-trigger-width))] min-w-[16rem] rounded-[10px] border border-[var(--tm-border)] bg-[var(--tm-elevated)] p-1.5 shadow-lg"
      >
        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold text-slate-300">
          {query.trim() ? 'Search results' : 'Suggested contacts'}
        </p>
        {loading && suggestions.length === 0 ? (
          <p className="px-2.5 py-3 text-[11px] text-slate-500">Searching users…</p>
        ) : suggestions.length === 0 ? (
          <p className="px-2.5 py-3 text-[11px] text-slate-500">No matching users.</p>
        ) : (
          <ul role="listbox" className="max-h-72 overflow-y-auto">
            {suggestions.map((u, i) => {
              const name = u.printingName || u.loginId || '—';
              return (
                <li key={u.loginNo} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(u)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors',
                      i === activeIndex ? 'bg-[#0EA5E9]/12' : 'hover:bg-[var(--tm-muted)]/80'
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-[11px] font-semibold text-white">
                        {getUserInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-slate-100 [overflow-wrap:anywhere]">{name}</span>
                      <span className="block text-[11px] text-slate-500 [overflow-wrap:anywhere]">{u.email || u.loginId || '—'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
