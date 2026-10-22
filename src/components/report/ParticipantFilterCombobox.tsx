import * as React from 'react';
import { CrmSearchSelect } from '@/components/ui/CrmSearchSelect';
import { apiService } from '@/services/apiService';
import { userService } from '@/services/userService';
import { searchEmployees } from '@/lib/meetingParticipants';
import type { BusinessEntityContactResponse } from '@/components/meetings/BusinessEntityCombobox';
import { cn } from '@/lib/utils';

/**
 * One meeting-report participant filter. `kind` picks the report parameter:
 * user → UserNo, employee → EmpNo, businessEntity → BusinessEntityNo, name → ParticipantsName.
 */
export interface ParticipantFilter {
  kind: 'user' | 'employee' | 'businessEntity' | 'name';
  value: string;
  label: string;
}

type Option = ParticipantFilter & { sub?: string };

const MAX_PER_SOURCE = 6;

const KIND_TAG: Record<ParticipantFilter['kind'], { label: string; className: string }> = {
  name: { label: 'Name', className: 'bg-amber-500/15 text-amber-600' },
  user: { label: 'User', className: 'bg-sky-500/15 text-sky-500' },
  employee: { label: 'Employee', className: 'bg-violet-500/15 text-violet-500' },
  businessEntity: { label: 'Business entity', className: 'bg-slate-500/15 text-slate-400' },
};

async function searchContacts(keyword: string): Promise<BusinessEntityContactResponse[]> {
  const response = await apiService.get<{ data?: BusinessEntityContactResponse[] } | BusinessEntityContactResponse[]>(
    '/api/master/business-entities/contact-persons',
    { params: { KeywordSearch: keyword }, silent: true }
  );
  return Array.isArray(response) ? response : response?.data ?? [];
}

interface ParticipantFilterComboboxProps {
  value: ParticipantFilter | undefined;
  onChange: (value: ParticipantFilter | undefined) => void;
  className?: string;
}

/**
 * Searches users, employees and business-entity contacts in one list; any typed text can also be
 * used as a name search (e.g. external participants, matched by name).
 */
export function ParticipantFilterCombobox({ value, onChange, className }: ParticipantFilterComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const keyword = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      const [users, employees, contacts] = await Promise.allSettled([
        userService.searchUsers(keyword),
        searchEmployees(keyword),
        searchContacts(keyword),
      ]);
      if (cancelled) return;
      const userOptions: Option[] = (users.status === 'fulfilled' ? users.value : [])
        .slice(0, MAX_PER_SOURCE)
        .map((u) => ({ kind: 'user', value: String(u.loginNo), label: u.printingName || u.loginId || '—', sub: u.email || u.loginId }));
      const employeeOptions: Option[] = (employees.status === 'fulfilled' ? employees.value : [])
        .slice(0, MAX_PER_SOURCE)
        .map((e) => ({ kind: 'employee', value: String(e.empNo), label: e.empName || e.empCode || '—', sub: [e.empCode, e.email].filter(Boolean).join(' · ') }));
      // The report filters by business entity: one option per entity, named after it.
      const seenEntities = new Set<number>();
      const entityOptions: Option[] = [];
      for (const c of contacts.status === 'fulfilled' ? contacts.value : []) {
        if (seenEntities.has(c.businessEntityNo) || entityOptions.length >= MAX_PER_SOURCE) continue;
        seenEntities.add(c.businessEntityNo);
        entityOptions.push({
          kind: 'businessEntity',
          value: String(c.businessEntityNo),
          label: c.businessEntityName || c.contactPersonName || '—',
          sub: c.contactPersonName ? `Contact: ${c.contactPersonName}` : undefined,
        });
      }
      setResults([...userOptions, ...employeeOptions, ...entityOptions]);
      setLoading(false);
    }, keyword ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const typed = query.trim();
  const items: Option[] = typed
    ? [{ kind: 'name', value: typed, label: typed, sub: 'Any participant with this name (incl. external)' }, ...results]
    : results;

  return (
    <CrmSearchSelect<Option>
      items={items}
      getKey={(o) => `${o.kind}:${o.value}`}
      getLabel={(o) => o.label}
      selectedKeys={value ? [`${value.kind}:${value.value}`] : []}
      onSelect={(o) => onChange({ kind: o.kind, value: o.value, label: o.label })}
      onClear={() => onChange(undefined)}
      displayLabel={value ? (value.kind === 'name' ? `Name: ${value.label}` : value.label) : ''}
      placeholder="Search user, employee, business entity or name"
      emptyText={typed ? 'No matches' : 'Type to search participants'}
      onQueryChange={setQuery}
      serverSearch
      loading={loading}
      loadingText="Searching participants…"
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      className={className}
      renderOption={(o) => (
        <span className="flex min-w-0 items-start gap-2">
          <span className={cn('mt-px shrink-0 rounded px-1 text-[9px] font-semibold', KIND_TAG[o.kind].className)}>{KIND_TAG[o.kind].label}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-[#0c1a3a] dark:text-slate-100">{o.label}</span>
            {o.sub ? <span className="block truncate text-[11px] text-[#7a8494]">{o.sub}</span> : null}
          </span>
        </span>
      )}
    />
  );
}
