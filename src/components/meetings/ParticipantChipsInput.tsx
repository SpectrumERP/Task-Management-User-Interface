import * as React from 'react';
import { AlertCircle, Mail, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { userService, type UserResponse } from '@/services/userService';
import {
  PARTICIPANT_TYPE,
  isExternalIncomplete,
  participantLabel,
  searchEmployees,
  type EmployeeOption,
  type ParticipantValue,
} from '@/lib/meetingParticipants';
import { getUserInitials } from '@/lib/userProfile';
import { employeeRef, userRef } from '@/lib/personDetails';
import { PersonHoverCard } from '@/components/ui/PersonHoverCard';
import { cn } from '@/lib/utils';
import { SkeletonList } from '@/components/ui/skeleton';

type Suggestion =
  | { kind: 'user'; key: string; name: string; sub: string; user: UserResponse }
  | { kind: 'employee'; key: string; name: string; sub: string; employee: EmployeeOption }
  | { kind: 'external'; key: string; name: string; sub: string; email: string };

const MAX_PER_SOURCE = 6;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** Characters that end a typed address, as in Outlook's To field. */
const SEPARATORS = /[;,\n]/;

const TYPE_TAG: Record<number, { label: string; className: string }> = {
  [PARTICIPANT_TYPE.user]: { label: 'User', className: 'bg-sky-500/15 text-sky-500' },
  [PARTICIPANT_TYPE.employee]: { label: 'Employee', className: 'bg-violet-500/15 text-violet-500' },
  [PARTICIPANT_TYPE.external]: { label: 'External', className: 'bg-amber-500/15 text-amber-600' },
  [PARTICIPANT_TYPE.businessEntity]: { label: 'Contact', className: 'bg-slate-500/15 text-slate-400' },
};

/** "Jane Doe <jane@x.com>" or "jane@x.com" → name + email; null when it is not an address. */
function parseAddress(raw: string): { name: string; email: string } | null {
  const text = raw.trim();
  const angled = text.match(/^(.*)<([^<>]+)>$/);
  const email = (angled ? angled[2] : text).trim();
  if (!EMAIL_RE.test(email)) return null;
  const name = (angled ? angled[1] : '').trim().replace(/^"|"$/g, '');
  return { name, email };
}

interface ParticipantChipsInputProps {
  participants: ParticipantValue[];
  onAdd: (participant: ParticipantValue) => void;
  onRemove: (index: number) => void;
  /** Click on an external chip: edit its details (company, designation, contact…). */
  onEditExternal?: (index: number) => void;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
}

/**
 * Outlook "To" style participant field: one box of chips. Typing searches users and employees;
 * picking one adds it with its id and type. A typed email (Enter, comma, semicolon or a paste of
 * several) is added as an external participant.
 */
export function ParticipantChipsInput({ participants, onAdd, onRemove, onEditExternal, invalid, id, disabled }: ParticipantChipsInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [notice, setNotice] = React.useState('');

  // Search both sources on focus and as the user types (debounced).
  React.useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const keyword = query.trim();
    const run = async () => {
      setLoading(true);
      const [userResult, employeeResult] = await Promise.allSettled([
        userService.searchUsers(keyword),
        searchEmployees(keyword),
      ]);
      if (cancelled) return;
      setUsers(userResult.status === 'fulfilled' ? userResult.value : []);
      setEmployees(employeeResult.status === 'fulfilled' ? employeeResult.value : []);
      setLoading(false);
    };
    const timer = setTimeout(run, keyword ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, focused]);

  const taken = React.useMemo(() => {
    const userNos = new Set<number>();
    const empNos = new Set<number>();
    const emails = new Set<string>();
    participants.forEach((p) => {
      if (p.participantType === PARTICIPANT_TYPE.user && p.userNo) userNos.add(Number(p.userNo));
      if (p.participantType === PARTICIPANT_TYPE.employee && p.empNo) empNos.add(Number(p.empNo));
      if (p.email) emails.add(p.email.trim().toLowerCase());
    });
    return { userNos, empNos, emails };
  }, [participants]);

  const suggestions = React.useMemo<Suggestion[]>(() => {
    const userItems: Suggestion[] = users
      .filter((u) => !taken.userNos.has(Number(u.loginNo)))
      .slice(0, MAX_PER_SOURCE)
      .map((u) => ({
        kind: 'user',
        key: `u:${u.loginNo}`,
        name: u.printingName || u.loginId || '—',
        sub: u.email || u.loginId || '',
        user: u,
      }));
    const employeeItems: Suggestion[] = employees
      .filter((e) => !taken.empNos.has(Number(e.empNo)))
      .slice(0, MAX_PER_SOURCE)
      .map((e) => ({
        kind: 'employee',
        key: `e:${e.empNo}`,
        name: e.empName || e.empCode || '—',
        sub: [e.empCode, e.email].filter(Boolean).join(' · '),
        employee: e,
      }));
    const address = parseAddress(query);
    const externalItem: Suggestion[] =
      address && !taken.emails.has(address.email.toLowerCase())
        ? [{ kind: 'external', key: `x:${address.email}`, name: address.name || address.email, sub: 'Add as external participant', email: address.email }]
        : [];
    // A typed address is what the user most likely wants, so it comes first.
    return [...externalItem, ...userItems, ...employeeItems];
  }, [users, employees, taken, query]);

  const activeIndex = Math.max(0, Math.min(active, suggestions.length - 1));
  const open = focused && !disabled && (loading || suggestions.length > 0 || query.trim().length > 0);

  const reset = () => {
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const pick = (s: Suggestion) => {
    setNotice('');
    if (s.kind === 'user') {
      onAdd({
        participantType: PARTICIPANT_TYPE.user,
        userNo: Number(s.user.loginNo),
        participantName: s.name,
        email: s.user.email || '',
      });
    } else if (s.kind === 'employee') {
      onAdd({
        participantType: PARTICIPANT_TYPE.employee,
        empNo: Number(s.employee.empNo),
        participantName: s.name,
        email: s.employee.email || '',
      });
    } else {
      onAdd({ participantType: PARTICIPANT_TYPE.external, participantName: s.name, email: s.email });
    }
    reset();
  };

  /** Add every typed address in `text` as external; returns what could not be added. */
  const commitAddresses = (text: string): string => {
    const leftovers: string[] = [];
    const added = new Set<string>();
    text
      .split(SEPARATORS)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const address = parseAddress(part);
        const key = address?.email.toLowerCase();
        if (!address || !key) {
          leftovers.push(part);
          return;
        }
        if (taken.emails.has(key) || added.has(key)) return;
        added.add(key);
        onAdd({ participantType: PARTICIPANT_TYPE.external, participantName: address.name || address.email, email: address.email });
      });
    setNotice(leftovers.length ? `Not a valid email: ${leftovers.join(', ')}` : '');
    return leftovers.join(', ');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Tab' && !query.trim()) return;
      // Never submit the meeting form from here.
      e.preventDefault();
      if (suggestions[activeIndex]) pick(suggestions[activeIndex]);
      else if (query.trim()) setQuery(commitAddresses(query));
    } else if ((e.key === ';' || e.key === ',') && query.trim()) {
      e.preventDefault();
      setQuery(commitAddresses(query));
    } else if (e.key === 'Backspace' && !query && participants.length > 0) {
      onRemove(participants.length - 1);
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const groups: { title: string; items: Suggestion[] }[] = [
    { title: 'Email address', items: suggestions.filter((s) => s.kind === 'external') },
    { title: 'Users', items: suggestions.filter((s) => s.kind === 'user') },
    { title: 'Employees', items: suggestions.filter((s) => s.kind === 'employee') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-1">
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
              invalid && 'border-red-400',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            {participants.map((p, index) => {
              const label = participantLabel(p);
              const tag = TYPE_TAG[p.participantType] ?? TYPE_TAG[PARTICIPANT_TYPE.external];
              const isExternal = p.participantType === PARTICIPANT_TYPE.external;
              const incomplete = isExternalIncomplete(p);
              const editable = isExternal && !disabled && Boolean(onEditExternal);
              const details = incomplete
                ? 'Details missing — click to add company, designation and contact no'
                : [tag.label, p.email, p.companyName, p.designation, p.contactNo].filter(Boolean).join(' · ');
              // Users and employees open their profile card on hover; externals / contacts have none.
              const person =
                p.participantType === PARTICIPANT_TYPE.user
                  ? userRef(p.userNo)
                  : p.participantType === PARTICIPANT_TYPE.employee
                    ? employeeRef(p.empNo)
                    : null;
              return (
                <span
                  key={`${p.participantType}:${p.userNo ?? p.empNo ?? p.businessEntityContactPersonDetailNo ?? p.email ?? index}`}
                  title={person ? undefined : details}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-[6px] border py-0.5 pl-1 pr-0.5',
                    incomplete ? 'border-amber-500/60 bg-amber-500/10' : 'border-[var(--tm-border)] bg-[var(--tm-muted)]/60'
                  )}
                >
                  <PersonHoverCard person={person} name={label} className="items-center gap-1">
                    {p.participantType === PARTICIPANT_TYPE.external ? (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                        <Mail size={11} />
                      </span>
                    ) : (
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-[9px] font-semibold text-white">
                          {getUserInitials(label)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditExternal?.(index);
                        }}
                        aria-label={`Edit details for ${label}`}
                        className="h-auto max-w-[12rem] gap-1 rounded-[4px] p-0 text-[11px] font-medium text-slate-100 hover:bg-transparent hover:underline"
                      >
                        <span className="truncate">{label}</span>
                        {incomplete ? <AlertCircle size={12} className="shrink-0 text-amber-500" aria-label="Details missing" /> : null}
                      </Button>
                    ) : (
                      <span className="max-w-[12rem] truncate text-[11px] font-medium text-slate-100">{label}</span>
                    )}
                  </PersonHoverCard>
                  <span className={cn('rounded px-1 text-[9px] font-semibold', tag.className)}>{tag.label}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      aria-label={`Remove ${label}`}
                      title="Remove"
                      className="h-5 w-5 shrink-0 rounded-[4px] text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <X size={12} strokeWidth={2.25} />
                    </Button>
                  )}
                </span>
              );
            })}
            <input
              ref={inputRef}
              id={id}
              value={query}
              disabled={disabled}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setNotice('');
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (!SEPARATORS.test(text)) return;
                e.preventDefault();
                setQuery(commitAddresses(`${query}${text}`));
              }}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                // Keep the list open while the pointer is on it (it lives in a portal).
                const next = e.relatedTarget as Node | null;
                if (next && document.querySelector('[data-participant-chips-list]')?.contains(next)) return;
                setFocused(false);
              }}
              onKeyDown={onKeyDown}
              placeholder={participants.length ? '' : 'Type a name to search users / employees, or enter an email'}
              role="combobox"
              aria-label="Participants"
              aria-expanded={open}
              aria-autocomplete="list"
              className="h-7 min-w-[12rem] flex-1 bg-transparent px-1 text-[12px] text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          data-participant-chips-list
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (boxRef.current?.contains(e.target as Node)) e.preventDefault();
            else setFocused(false);
          }}
          className="z-[9999] w-[min(26rem,var(--radix-popover-trigger-width))] min-w-[18rem] rounded-[10px] border border-[var(--tm-border)] bg-[var(--tm-elevated)] p-1.5 shadow-lg"
        >
          {loading && suggestions.length === 0 ? (
            <SkeletonList rows={3} avatar className="py-0.5" label="Searching users and employees" />
          ) : suggestions.length === 0 ? (
            <p className="px-2.5 py-3 text-[11px] text-slate-500">
              No matching users or employees. Type a full email address to add an external participant.
            </p>
          ) : (
            <ul role="listbox" className="max-h-80 overflow-y-auto">
              {groups.map((group) => (
                <li key={group.title} role="presentation">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
                  <ul role="presentation">
                    {group.items.map((s) => {
                      const i = suggestions.indexOf(s);
                      return (
                        <li key={s.key} role="option" aria-selected={i === activeIndex}>
                          <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(s)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left transition-colors',
                              i === activeIndex ? 'bg-[#0EA5E9]/12' : 'hover:bg-[var(--tm-muted)]/80'
                            )}
                          >
                            {s.kind === 'external' ? (
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                                <Mail size={13} />
                              </span>
                            ) : (
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-[10px] font-semibold text-white">
                                  {getUserInitials(s.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-semibold text-slate-100 [overflow-wrap:anywhere]">{s.name}</span>
                              <span className="block text-[11px] text-slate-500 [overflow-wrap:anywhere]">{s.sub || '—'}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {notice ? <p className="text-[11px] text-red-400">{notice}</p> : null}
    </div>
  );
}
