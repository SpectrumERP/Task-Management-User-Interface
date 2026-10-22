import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Clock,
  GitBranch,
  History,
  MessageSquare,
  Paperclip,
  Plus,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUtcDateTime } from '@/lib/dateTime';
import { formatTimeAgo } from '@/lib/taskFreshness';
import { cn } from '@/lib/utils';

/**
 * Task timeline (GET /api/crm/tasks/timeline/{id}) — same contract and behaviour as the CRM's
 * lead / opportunity timeline: newest first, 20 per page, next page when scrolled to the end,
 * optional filter on the types seen so far.
 */

/** Entries per request. */
const TIMELINE_PAGE_SIZE = 20;

interface ServerTimelineRow {
  title?: string | null;
  description?: string | null;
  timelineType?: string | null;
  timelineTypeNo?: number | null;
  actionDate?: string | null;
  createdBy?: { loginNo?: number; loginId?: string | null; printingName?: string | null } | null;
}

interface TimelineResponse {
  success: boolean;
  message?: string;
  data?: ServerTimelineRow[] | null;
  pageNo?: number;
  totalRecords?: number;
  totalPages?: number;
}

interface TimelineEntry {
  title: string;
  description: string;
  type: string;
  typeNo?: number;
  at: string;
  by: string;
}

function entryFromRow(row: ServerTimelineRow): TimelineEntry {
  return {
    title: row.title?.trim() || row.timelineType || 'Update',
    description: row.description?.trim() ?? '',
    type: row.timelineType ?? '',
    typeNo: row.timelineTypeNo ?? undefined,
    at: row.actionDate ?? '',
    by: row.createdBy?.printingName?.trim() || row.createdBy?.loginId || '',
  };
}

async function fetchTimelinePage(taskNo: number, pageNo: number, timelineTypeNo?: number) {
  const response = await apiService.get<TimelineResponse>(`/api/crm/tasks/timeline/${taskNo}`, {
    params: {
      PageNo: String(pageNo),
      PageSize: String(TIMELINE_PAGE_SIZE),
      SortingColumnName: 'ActionDate',
      SortingType: 'DESC',
      ...(timelineTypeNo !== undefined ? { TimelineTypeNo: String(timelineTypeNo) } : {}),
    },
    // Errors show inline with a Retry button instead of a toast.
    silent: true,
  });
  if (!response?.success) throw new Error(response?.message || 'Could not load the timeline');
  const entries = (response.data ?? []).map(entryFromRow);
  // Servers that omit the totals: a short page is the last one.
  const totalPages =
    Number(response.totalPages) || (entries.length < TIMELINE_PAGE_SIZE ? pageNo : pageNo + 1);
  return { entries, totalPages, totalRecords: Number(response.totalRecords) || 0 };
}

const ICONS: { match: RegExp; icon: LucideIcon; tone: string }[] = [
  { match: /created/, icon: Plus, tone: 'bg-emerald-500/15 text-emerald-500' },
  { match: /status|stage/, icon: Zap, tone: 'bg-sky-500/15 text-sky-500' },
  { match: /comment|note/, icon: MessageSquare, tone: 'bg-amber-500/15 text-amber-500' },
  { match: /effort|timelog|hours/, icon: Clock, tone: 'bg-violet-500/15 text-violet-500' },
  { match: /roadblock|challenge|execution/, icon: AlertTriangle, tone: 'bg-orange-500/15 text-orange-500' },
  { match: /attach|document|file/, icon: Paperclip, tone: 'bg-slate-500/15 text-slate-400' },
  { match: /assign|owner|collaborat|inform|report/, icon: UserPlus, tone: 'bg-indigo-500/15 text-indigo-500' },
  { match: /due|date|reminder/, icon: CalendarClock, tone: 'bg-rose-500/15 text-rose-500' },
  { match: /checklist/, icon: CheckSquare, tone: 'bg-teal-500/15 text-teal-500' },
  { match: /subtask/, icon: GitBranch, tone: 'bg-cyan-500/15 text-cyan-500' },
];

function iconFor(entry: TimelineEntry) {
  const text = `${entry.type} ${entry.title}`.toLowerCase().replace(/[\s_-]+/g, '');
  return ICONS.find((i) => i.match.test(text)) ?? { icon: History, tone: 'bg-slate-500/15 text-slate-400' };
}

/** Readable name for a timeline type: the entry's title, else the type split into words. */
function typeLabel(entry: TimelineEntry): string {
  return entry.title || entry.type.replace(/([a-z])([A-Z])/g, '$1 $2') || `Type ${entry.typeNo}`;
}

/** Every field equal → shown once (the server can repeat a row; pages overlap when entries are added). */
function withoutDuplicates(entries: readonly TimelineEntry[]): TimelineEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = [e.type, e.typeNo ?? '', e.title, e.description, e.at, e.by].join('\u0001');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ALL_TYPES = 'all';

export function TaskTimeline({ taskNo, refreshKey }: { taskNo: number; refreshKey?: string | number }) {
  const [typeNo, setTypeNo] = useState<number | undefined>(undefined);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [pageNo, setPageNo] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Types seen in any loaded page, kept while a type filter is on (so the filter can be changed back).
  const [types, setTypes] = useState<Map<number, string>>(() => new Map());
  const requestRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (page: number, reset: boolean) => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTimelinePage(taskNo, page, typeNo);
        if (request !== requestRef.current) return;
        setEntries((prev) => (reset ? result.entries : [...prev, ...result.entries]));
        setPageNo(page);
        setTotalPages(result.totalPages);
        setTotalRecords(result.totalRecords);
        setTypes((prev) => {
          const next = new Map(prev);
          for (const e of result.entries) {
            if (e.typeNo !== undefined && !next.has(e.typeNo)) next.set(e.typeNo, typeLabel(e));
          }
          return next.size === prev.size ? prev : next;
        });
      } catch (err) {
        if (request === requestRef.current) setError(err instanceof Error ? err.message : 'Could not load the timeline');
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [taskNo, typeNo]
  );

  // First page whenever the task, the filter or the refresh key changes — once per change
  // (StrictMode runs effects twice in dev).
  const firstPageKey = useRef('');
  useEffect(() => {
    const key = `${taskNo}:${typeNo ?? ''}:${refreshKey ?? ''}`;
    if (firstPageKey.current === key) return;
    firstPageKey.current = key;
    void load(1, true);
  }, [load, taskNo, typeNo, refreshKey]);

  const hasMore = pageNo > 0 && pageNo < totalPages;

  // Sentinel in view → next page; on a short list it stays in view, so pages keep loading until the list fills.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || error) return;
    const observer = new IntersectionObserver(
      (items) => {
        if (items.some((item) => item.isIntersecting)) void load(pageNo + 1, false);
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, error, load, pageNo]);

  const shown = withoutDuplicates(entries);
  const initialLoad = pageNo === 0 && loading;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400">
          {initialLoad
            ? 'Loading timeline…'
            : `${shown.length}${totalRecords > shown.length ? ` of ${totalRecords}` : ''} ${(totalRecords || shown.length) === 1 ? 'entry' : 'entries'}`}
        </p>
        {types.size > 1 || typeNo !== undefined ? (
          <Select
            value={typeNo === undefined ? ALL_TYPES : String(typeNo)}
            onValueChange={(value) => setTypeNo(value === ALL_TYPES ? undefined : Number(value))}
          >
            <SelectTrigger aria-label="Timeline type" className="h-8 w-48 rounded-[8px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[10px]">
              <SelectItem value={ALL_TYPES} className="text-xs">All types</SelectItem>
              {[...types.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([no, label]) => (
                  <SelectItem key={no} value={String(no)} className="text-xs">{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {shown.length > 0 ? (
        <ol className="m-0 list-none overflow-hidden rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] p-0">
          {shown.map((entry, i) => {
            const { icon: Icon, tone } = iconFor(entry);
            const last = i === shown.length - 1;
            return (
              <li
                key={`${entry.typeNo ?? entry.type}-${entry.at}-${i}`}
                className={cn('flex gap-2.5 px-3 py-2', !last && 'border-b border-[var(--tm-border)]/60')}
              >
                <div className="flex w-6 shrink-0 flex-col items-center self-stretch pt-0.5">
                  <span className={cn('relative z-[1] flex h-6 w-6 items-center justify-center rounded-full', tone)}>
                    <Icon size={12} strokeWidth={2} aria-hidden />
                  </span>
                  {last ? null : <span className="mt-1 w-px flex-1 bg-[var(--tm-border)]" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] font-semibold text-slate-100">{entry.title}</p>
                    {entry.at ? (
                      <span className="shrink-0 text-[11px] text-slate-400" title={formatUtcDateTime(entry.at)}>
                        {formatTimeAgo(entry.at)}
                      </span>
                    ) : null}
                  </div>
                  {entry.description ? (
                    <p className="mt-0.5 whitespace-pre-line break-words text-[11px] leading-snug text-slate-300">
                      {entry.description}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {entry.by ? <>By <span className="font-medium text-slate-400">{entry.by}</span> · </> : null}
                    {formatUtcDateTime(entry.at, '')}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : !loading && !error ? (
        <EmptyState
          compact
          icon={History}
          title={typeNo === undefined ? 'No timeline activity yet' : 'No entries of this type'}
          description="Timeline entries will appear as this task progresses."
        />
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[8px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          <span>Could not load the timeline: {error}</span>
          <button type="button" className="font-semibold underline" onClick={() => void load(pageNo + 1, pageNo === 0)}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-3">
          <BrandLoader size="sm" message={initialLoad ? 'Loading timeline' : undefined} />
        </div>
      ) : null}

      {/* Scroll sentinel: reaching it loads the next page. */}
      {hasMore ? <div ref={sentinelRef} className="h-px" aria-hidden /> : null}
      {!hasMore && pageNo > 1 && !loading ? (
        <p className="py-1 text-center text-[11px] text-slate-500">All {shown.length} entries loaded</p>
      ) : null}
    </div>
  );
}
