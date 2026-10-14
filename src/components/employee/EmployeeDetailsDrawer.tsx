import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Copy,
  FileText,
  Hash,
  IdCard,
  Mail,
  MapPin,
  Network,
  Phone,
  PhoneForwarded,
  UserRound,
  UserSquare2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/lib/dateTime';
import type { Employee } from '@/types/employee';
import { employeeProfilePath } from '@/lib/employeeDirectory';
import { EmployeeAvatar, EmployeeSection, EmployeeStatusPill } from './employeeShared';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'job', label: 'Job Details' },
  { id: 'contact', label: 'Contact' },
  { id: 'more', label: 'More' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Underlined tab strip — CRM blue for the active tab. */
const tabTriggerClass =
  'relative h-9 rounded-none bg-transparent px-0 pb-2 pt-1 text-[13px] font-semibold text-slate-400 shadow-none ' +
  'hover:text-slate-200 data-[state=active]:bg-transparent data-[state=active]:text-[#1E56A0] dark:data-[state=active]:text-[#4f86d1] ' +
  'data-[state=active]:shadow-[inset_0_-2px_0_#1E56A0] dark:data-[state=active]:shadow-[inset_0_-2px_0_#4f86d1]';

/** Same chrome as the Tasks header buttons: outlined secondary / CRM-blue primary. */
const outlineBtn =
  'h-8 px-3 text-[12px] font-semibold gap-1.5 rounded-[7px] border border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)] inline-flex items-center';
const iconBtn =
  'h-8 w-8 p-0 rounded-[8px] text-slate-400 hover:bg-[var(--tm-muted)] hover:text-slate-200 transition-colors disabled:opacity-40';

interface EmployeeDetailsDrawerProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  /** Desktop: the drawer's left edge lines up with this element's right edge (the search box). */
  alignLeftTo?: RefObject<HTMLElement | null>;
  /** Position of the employee in the whole result set (across pages), for the "3 / 36" counter. */
  position?: { index: number; total: number } | null;
  onPrev?: () => void;
  onNext?: () => void;
}

const DESKTOP_MIN_PX = 1024; // Tailwind `lg`
const ANCHOR_GAP_PX = 12;
const MIN_WIDTH_PX = 512; // never narrower than the default 32rem

/**
 * Desktop width = from the anchor's right edge to the viewport's right edge. Re-measured when the anchor's
 * row resizes (sidebar collapse / expand, filters push) and on window resize; null = default width.
 */
function useAnchoredWidth(anchor: RefObject<HTMLElement | null> | undefined, open: boolean): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = anchor?.current;
    if (!open || !el) return;
    const measure = () => {
      if (window.innerWidth < DESKTOP_MIN_PX) {
        setWidth(null);
        return;
      }
      const available = window.innerWidth - el.getBoundingClientRect().right - ANCHOR_GAP_PX;
      setWidth(Math.max(MIN_WIDTH_PX, Math.round(available)));
    };
    // ResizeObserver also fires once on observe, so this measures on open too.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [anchor, open]);

  return open ? width : null;
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Couldn’t copy ${label.toLowerCase()}`);
  }
}

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <ActionTip label={`Copy ${label.toLowerCase()}`}>
      <button
        type="button"
        onClick={() => void copyText(label, value)}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-[#1E56A0]/10 hover:text-[#1E56A0] dark:hover:text-[#4f86d1] transition-colors"
      >
        <Copy size={12} />
      </button>
    </ActionTip>
  );
}

type Field = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  copy?: boolean;
  /** Spans both grid columns (long text) */
  wide?: boolean;
  render?: ReactNode;
};

/**
 * Field grid: one cell per field, hairline rules between cells (gap-px over the border colour), edge to edge
 * in the card. Short fields pair up two per row; long ones (wide) take a full row; an odd short field gets an
 * empty partner cell so every row is complete. Empty fields are left out.
 */
function FieldGrid({ fields }: { fields: Field[] }) {
  const shown = fields.filter((f) => f.value.trim());
  if (shown.length === 0) return null;
  const short = shown.filter((f) => !f.wide);
  const wide = shown.filter((f) => f.wide);

  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--tm-border)] sm:grid-cols-2">
      {short.map((f) => (
        <FieldCell key={f.label} field={f} />
      ))}
      {short.length % 2 === 1 ? <div aria-hidden className="hidden bg-[var(--tm-surface)] sm:block" /> : null}
      {wide.map((f) => (
        <FieldCell key={f.label} field={f} className="sm:col-span-2" />
      ))}
    </div>
  );
}

function FieldCell({ field: f, className }: { field: Field; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-[var(--tm-surface)] px-4 py-3', className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
        <f.icon size={12} strokeWidth={1.9} className="shrink-0 text-[#1E56A0]/70 dark:text-[#4f86d1]/80" />
        {f.label}
      </div>
      <div className="mt-1 flex min-h-[1.5rem] min-w-0 items-center gap-1">
        {f.render ? (
          f.render
        ) : f.href ? (
          <a
            href={f.href}
            title={f.value}
            className="min-w-0 truncate text-[13px] font-medium text-[#1E56A0] dark:text-[#4f86d1] hover:underline underline-offset-2"
          >
            {f.value}
          </a>
        ) : (
          <span
            className={cn('min-w-0 text-[13px] font-medium text-slate-100', f.wide ? 'leading-relaxed' : 'truncate')}
            title={f.value}
          >
            {f.value}
          </span>
        )}
        {f.copy ? <CopyButton label={f.label} value={f.value} /> : null}
      </div>
    </div>
  );
}

/** A titled card; hidden entirely when none of its fields has a value. */
function FieldCard({ title, icon, fields }: { title: string; icon: LucideIcon; fields: Field[] }) {
  if (!fields.some((f) => f.value.trim())) return null;
  return (
    <EmployeeSection title={title} icon={icon} bodyClassName="p-0">
      <FieldGrid fields={fields} />
    </EmployeeSection>
  );
}

function TabEmpty({ text }: { text: string }) {
  return <EmptyState compact icon={FileText} title="No details available" description={text} />;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const dateText = (value: string) => (value ? formatDateOnly(value, '') : '');

function hasAny(fields: Field[]) {
  return fields.some((f) => f.value.trim());
}

export function EmployeeDetailsDrawer({
  employee,
  open,
  onClose,
  alignLeftTo,
  position,
  onPrev,
  onNext,
}: EmployeeDetailsDrawerProps) {
  const anchoredWidth = useAnchoredWidth(alignLeftTo, open);
  // Kept while stepping through employees, so the same section can be compared quickly.
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="menu"]')) return;
      // ↑ / ↓ step through the list (← / → stay with the tab strip).
      if (e.key === 'ArrowUp' && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowDown' && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onPrev, onNext]);

  const e = employee;
  const email: Field | null = e ? { icon: Mail, label: 'Email', value: e.email, href: `mailto:${e.email}`, copy: true } : null;
  const phone: Field | null = e ? { icon: Phone, label: 'Phone No.', value: e.phone, href: telHref(e.phone), copy: true } : null;
  const ext: Field | null = e ? { icon: PhoneForwarded, label: 'Extension Number', value: e.extension } : null;

  const basic: Field[] = e
    ? [
        { icon: Hash, label: 'Employee ID', value: e.empCode, copy: true },
        { icon: Network, label: 'Department', value: e.department },
        { icon: Building2, label: 'Company Name', value: e.companyName },
        { icon: MapPin, label: 'Work Location', value: e.workLocation },
        {
          icon: CircleDot,
          label: 'Status',
          value: e.status,
          render: <EmployeeStatusPill status={e.status} />,
        },
      ]
    : [];
  const contact: Field[] = e && email && phone && ext ? [email, phone, ext] : [];
  const job: Field[] = e
    ? [
        { icon: Network, label: 'Department', value: e.department },
        { icon: CalendarDays, label: 'Date of Joining', value: dateText(e.dateOfJoining) },
        { icon: Briefcase, label: 'Employment Type', value: e.employmentType },
        { icon: Hash, label: 'Grade', value: e.grade },
        { icon: FileText, label: 'Job Description', value: e.jobDescription, wide: true },
      ]
    : [];
  const contactTab: Field[] = e
    ? [...contact, { icon: MapPin, label: 'Work Location', value: e.workLocation }]
    : [];
  const more: Field[] = e
    ? [
        { icon: Building2, label: 'Company Name', value: e.companyName },
        { icon: UserRound, label: 'Gender', value: e.gender },
        { icon: CalendarDays, label: 'Date of Birth', value: dateText(e.dateOfBirth) },
        { icon: MapPin, label: 'Address', value: e.address, wide: true },
      ]
    : [];

  const metaChips = e
    ? [
        { icon: Building2, value: e.companyName, label: 'Company' },
        { icon: MapPin, value: e.workLocation, label: 'Work location' },
        { icon: PhoneForwarded, value: e.extension ? `Ext. ${e.extension}` : '', label: 'Extension' },
      ].filter((c) => c.value)
    : [];

  return (
    <>
      {/* <lg: overlay with a scrim */}
      {open ? (
        <button
          type="button"
          aria-label="Close employee details"
          className="fixed inset-x-0 top-[calc(3.5rem+1px)] bottom-8 z-[115] bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      {/* Opens over the page (no push), from the search box's right edge on desktop; the table stays
          clickable so another row can be picked. Ends above the app footer (h-8 in MainLayout). */}
      <aside
        role="complementary"
        aria-label="Employee details"
        aria-hidden={!open}
        style={anchoredWidth ? { width: anchoredWidth } : undefined}
        className={cn(
          'fixed top-[calc(3.5rem+1px)] right-0 bottom-8 z-[120] w-[min(100vw,32rem)] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none',
          open
            ? 'translate-x-0 shadow-[-12px_0_32px_-12px_rgba(15,23,42,0.28)]'
            : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden border-l border-[var(--tm-border)] bg-[var(--tm-surface)]">
          {/* Title bar: list stepper + close */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--tm-border)] bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-100">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#1E56A0] ring-1 ring-[#1E56A0]/12">
                <UserSquare2 size={14} strokeWidth={1.75} />
              </span>
              Employee Details
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {position && position.total > 0 ? (
                <>
                  <span className="mr-1 text-[12px] tabular-nums text-slate-400" aria-live="polite">
                    {position.index + 1} / {position.total}
                  </span>
                  <ActionTip label="Previous employee (↑)">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onPrev}
                      disabled={!onPrev}
                      aria-label="Previous employee"
                      className={iconBtn}
                    >
                      <ChevronUp size={16} strokeWidth={2} />
                    </Button>
                  </ActionTip>
                  <ActionTip label="Next employee (↓)">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onNext}
                      disabled={!onNext}
                      aria-label="Next employee"
                      className={iconBtn}
                    >
                      <ChevronDown size={16} strokeWidth={2} />
                    </Button>
                  </ActionTip>
                  <span className="mx-1 h-5 w-px bg-[var(--tm-border)]" aria-hidden />
                </>
              ) : null}
              <ActionTip label="Close (Esc)">
                <Button type="button" variant="ghost" onClick={onClose} aria-label="Close employee details" className={iconBtn}>
                  <X size={15} strokeWidth={1.75} />
                </Button>
              </ActionTip>
            </div>
          </div>

          {e ? (
            <>
              {/* Identity header */}
              <div className="shrink-0 px-5 pt-4 pb-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* 80px: big enough for a real photo to be recognisable; initials when there is none. */}
                  <EmployeeAvatar
                    employee={e}
                    className="h-20 w-20 text-2xl ring-4 ring-[var(--tm-tint)] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-[18px] font-bold tracking-tight text-slate-50" title={e.empName}>
                        {e.empName || '—'}
                      </h2>
                      <EmployeeStatusPill status={e.status} />
                    </div>
                    {e.empCode ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <Link
                          to={employeeProfilePath(e.empNo)}
                          className="text-[13px] font-semibold text-[#1E56A0] dark:text-[#4f86d1] hover:underline underline-offset-2"
                        >
                          {e.empCode}
                        </Link>
                        <CopyButton label="Employee ID" value={e.empCode} />
                      </div>
                    ) : null}
                    {e.department ? (
                      <p className="mt-0.5 truncate text-[13px] text-slate-300">{e.department}</p>
                    ) : null}
                    {metaChips.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {metaChips.map((c) => (
                          <span
                            key={c.label}
                            title={c.label}
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--tm-border)] bg-[var(--tm-muted)] px-2 py-0.5 text-[11px] font-medium text-slate-300"
                          >
                            <c.icon size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate">{c.value}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {e.email || e.phone ? (
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                      {e.email ? (
                        <a
                          href={`mailto:${e.email}`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-[#1E56A0] px-3 text-[12px] font-semibold text-white hover:bg-[#17457F] transition-colors"
                        >
                          <Mail size={14} />
                          Send Email
                        </a>
                      ) : null}
                      {e.phone ? (
                        <a href={telHref(e.phone)} className={cn(outlineBtn, 'justify-center')}>
                          <Phone size={14} />
                          Call
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="h-auto w-full shrink-0 justify-start gap-6 overflow-x-auto rounded-none border-b border-[var(--tm-border)] bg-transparent p-0 px-5">
                  {TABS.map((t) => (
                    <TabsTrigger key={t.id} value={t.id} className={tabTriggerClass}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Tab bodies on the page tint, so the cards stand out */}
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek bg-[var(--tm-page)] px-5 py-4">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <FieldCard title="Basic Information" icon={IdCard} fields={basic} />
                    <FieldCard title="Contact Information" icon={Phone} fields={contact} />
                    {e.jobDescription ? (
                      <EmployeeSection title="Job Description" icon={FileText} bodyClassName="px-4 py-3">
                        <p className="text-[13px] leading-relaxed text-slate-200">{e.jobDescription}</p>
                      </EmployeeSection>
                    ) : null}
                    {!hasAny(basic) && !hasAny(contact) && !e.jobDescription ? (
                      <TabEmpty text="This employee record has no further details yet." />
                    ) : null}
                  </TabsContent>

                  <TabsContent value="job" className="mt-0">
                    {hasAny(job) ? (
                      <FieldCard title="Job Details" icon={Briefcase} fields={job} />
                    ) : (
                      <TabEmpty text="No job details are recorded for this employee." />
                    )}
                  </TabsContent>

                  <TabsContent value="contact" className="mt-0">
                    {hasAny(contactTab) ? (
                      <FieldCard title="Contact Information" icon={Phone} fields={contactTab} />
                    ) : (
                      <TabEmpty text="No contact details are recorded for this employee." />
                    )}
                  </TabsContent>

                  <TabsContent value="more" className="mt-0">
                    {hasAny(more) ? (
                      <FieldCard title="More Information" icon={UserRound} fields={more} />
                    ) : (
                      <TabEmpty text="No additional information is recorded for this employee." />
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
