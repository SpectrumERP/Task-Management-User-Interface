import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSkeletonPhase } from '@/hooks/useSkeletonPhase';

// What the app shows while data is on its way: the shape of the content to come, with a soft light passing over it
// (.tm-skeleton in index.css), instead of a spinner. Screen readers hear the label (role="status"); with reduced
// motion the shapes stay still. Each screen's shape follows its real layout, so nothing jumps when the data comes.

const pick = (list: number[], index: number) => list[index % list.length];

/** One bar. Size it with className (h-3 w-24…); onDark for the blue sidebar. */
export function Skeleton({ className = 'h-3.5 w-full', style, onDark = false }: { className?: string; style?: CSSProperties; onDark?: boolean }) {
  const phase = useSkeletonPhase();
  return <span aria-hidden className={cn('tm-skeleton block rounded', onDark && 'tm-skeleton-on-dark', className)} style={{ ...phase, ...style }} />;
}

/** The status wrapper every skeleton shape sits in (<output>: a live status for screen readers). */
function Loading({ label = 'Loading', className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <output aria-busy="true" className={cn('block', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </output>
  );
}

/** A small bar where a word or figure will come, or over content being refreshed ("Updating…"). */
export function SkeletonInline({ label = 'Loading', className = 'h-3 w-16' }: { label?: string; className?: string }) {
  return (
    <output aria-busy="true" className="inline-block shrink-0 align-middle">
      <span className="sr-only">{label}</span>
      <Skeleton className={className} />
    </output>
  );
}

/**
 * A pill over content that stays on screen while it refreshes (report filters, a page change): the rows are kept,
 * this says they are being updated.
 */
export function SkeletonUpdating({ label = 'Updating', className }: { label?: string; className?: string }) {
  return (
    <output
      aria-busy="true"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--tm-border)] bg-[var(--tm-surface)] px-3 py-1.5 shadow-[var(--tm-shadow-sm)]',
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-2 w-2 rounded-full" />
      <Skeleton className="h-2.5 w-16" />
    </output>
  );
}

const LINE_WIDTHS = [100, 92, 76, 84, 64];

/** A few lines of text (a description, a note). */
export function SkeletonLines({ lines = 3, label, className = 'space-y-2.5 py-2' }: { lines?: number; label?: string; className?: string }) {
  return (
    <Loading label={label} className={className}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-3" style={{ width: `${pick(LINE_WIDTHS, index)}%` }} />
      ))}
    </Loading>
  );
}

/** Dropdown options while the list is on its way: compact single-line rows. */
export function SkeletonOptions({ rows = 5, label, className = 'py-1' }: { rows?: number; label?: string; className?: string }) {
  return (
    <Loading label={label} className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-8 items-center px-3">
          <Skeleton className="h-2.5" style={{ width: `${pick([62, 48, 74, 54, 66], index)}%` }} />
        </div>
      ))}
    </Loading>
  );
}

/** List rows: an optional round avatar, a name and a second line (notifications, people). */
export function SkeletonList({
  rows = 4,
  avatar = false,
  label,
  className = 'divide-y divide-[var(--tm-border)]',
}: {
  rows?: number;
  avatar?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Loading label={label} className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 px-3 py-2.5">
          {avatar && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3" style={{ width: `${pick([66, 52, 74, 58], index)}%` }} />
            <Skeleton className="h-2.5" style={{ width: `${pick([38, 46, 30, 42], index)}%` }} />
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** Table rows: one bar per column. `columns`: their widths in %. */
function TableRows({ rows, columns }: { rows: number; columns: number[] }) {
  return Array.from({ length: rows }, (_, index) => (
    <div key={index} className="flex gap-6 border-b border-[var(--tm-border)]/60 px-4 py-3 last:border-0">
      {columns.map((width, at) => (
        <Skeleton key={at} className="h-3" style={{ width: `${Math.max(6, width + pick([0, -4, 3, -2, 2], index + at))}%` }} />
      ))}
    </div>
  ));
}

/** A data table: its head band (unless bare) and rows (task, employee, master and deal lists, notifications, reports). */
export function SkeletonTable({
  rows = 8,
  columns = [10, 26, 16, 14, 12, 10],
  bare = false,
  label,
  className,
}: {
  rows?: number;
  columns?: number[];
  bare?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Loading label={label} className={cn('min-w-0 overflow-hidden', className)}>
      {!bare && (
        <div className="flex h-10 items-center gap-6 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)] px-4">
          {columns.map((width, at) => (
            <Skeleton key={at} className="h-2.5" style={{ width: `${Math.round(width * 0.6)}%` }} />
          ))}
        </div>
      )}
      <TableRows rows={rows} columns={columns} />
    </Loading>
  );
}

/** A field's shape: its label, then its box. */
function FieldShape({ width = 'w-24', tall = false }: { width?: string; tall?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn('h-2.5', width)} />
      <Skeleton className={cn('w-full rounded-[8px]', tall ? 'h-20' : 'h-9')} />
    </div>
  );
}

const FIELD_LABELS = ['w-20', 'w-28', 'w-24', 'w-16', 'w-32', 'w-24'];

/**
 * A form: sections of fields in a grid (task, meeting, deal and master forms). `sections`: how many fields each
 * holds; `columns`: the grid's columns on wide screens; `textarea` adds a description box to the first section.
 */
export function SkeletonForm({
  sections = [6, 4],
  columns = 2,
  textarea = false,
  label,
  className = 'space-y-6',
}: {
  sections?: number[];
  columns?: 2 | 3;
  textarea?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Loading label={label} className={className}>
      {sections.map((fields, section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-3.5 w-36" />
          <div className={cn('grid grid-cols-1 gap-x-5 gap-y-4', columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2')}>
            {Array.from({ length: fields }, (_, index) => (
              <FieldShape key={index} width={FIELD_LABELS[(index + section) % FIELD_LABELS.length]} />
            ))}
          </div>
          {textarea && section === 0 && <FieldShape width="w-28" tall />}
        </div>
      ))}
    </Loading>
  );
}

/** The kanban board: status columns, each with its title and a few task cards. */
export function SkeletonBoard({ columns = 4, label }: { columns?: number; label?: string }) {
  return (
    <Loading label={label} className="flex h-full w-full min-h-0 gap-3 overflow-hidden px-1 pb-8 pt-1">
      {Array.from({ length: columns }, (_, column) => (
        <div
          key={column}
          className="flex w-[272px] shrink-0 flex-col gap-2.5 rounded-xl border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)]/50 p-2.5"
        >
          <div className="flex items-center gap-2 px-1 py-1">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3" style={{ width: `${pick([40, 52, 34, 46], column)}%` }} />
            <Skeleton className="ml-auto h-4 w-6 rounded-full" />
          </div>
          {Array.from({ length: pick([3, 2, 4, 2, 3], column) }, (_, card) => (
            <div key={card} className="space-y-2.5 rounded-lg border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] p-3">
              <Skeleton className="h-3" style={{ width: `${pick([82, 64, 74, 58], card + column)}%` }} />
              <Skeleton className="h-2.5" style={{ width: `${pick([54, 40, 62, 46], card + column)}%` }} />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="ml-auto h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** The schedule's month: weekday heads and a 5-week grid, with a few task chips. */
export function SkeletonCalendar({ label }: { label?: string }) {
  return (
    <Loading label={label} className="p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-[var(--tm-border)] bg-[var(--tm-border)]">
        {Array.from({ length: 7 }, (_, day) => (
          <div key={`head-${day}`} className="flex h-9 items-center justify-center bg-[var(--tm-elevated)]">
            <Skeleton className="h-2.5 w-8" />
          </div>
        ))}
        {Array.from({ length: 35 }, (_, cell) => (
          <div key={cell} className="min-h-[96px] space-y-1.5 bg-[var(--tm-surface)] p-2">
            <Skeleton className="h-2.5 w-5" />
            {cell % 3 === 1 && <Skeleton className="h-4 w-full rounded-md" />}
            {cell % 5 === 2 && <Skeleton className="h-4 w-3/4 rounded-md" />}
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** A card with a title and a few lines (a section of a detail page). */
function SectionShape({ lines = 3, title = 'w-32' }: { lines?: number; title?: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-4 sm:p-5">
      <Skeleton className={cn('h-3.5', title)} />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-3" style={{ width: `${pick(LINE_WIDTHS, index)}%` }} />
      ))}
    </div>
  );
}

/** A task's details: the title and description, its checklist and activity, and the side column of its properties. */
export function SkeletonDetails({ label }: { label?: string }) {
  return (
    <Loading label={label} className="p-4 sm:p-5">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-8">
          <div className="space-y-3 rounded-2xl border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-4 sm:p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <SectionShape lines={4} title="w-24" />
          <SectionShape lines={3} title="w-28" />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <div className="space-y-3.5 rounded-2xl border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <Skeleton className="h-2.5" style={{ width: `${pick([28, 22, 34, 26], index)}%` }} />
                <Skeleton className="h-3" style={{ width: `${pick([40, 52, 34, 46], index)}%` }} />
              </div>
            ))}
          </div>
          <SectionShape lines={2} title="w-20" />
        </div>
      </div>
    </Loading>
  );
}

/** A person's profile: avatar, name and role, then their details in a grid. `compact`: the hover card. */
export function SkeletonProfile({ compact = false, label }: { compact?: boolean; label?: string }) {
  if (compact) {
    return (
      <Loading label={label} className="space-y-3 py-1 pr-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-5/6" />
        <Skeleton className="h-2.5 w-2/3" />
      </Loading>
    );
  }
  return (
    <Loading label={label} className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-32 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2.5" style={{ width: `${pick([30, 24, 36, 28], index)}%` }} />
            <Skeleton className="h-3.5" style={{ width: `${pick([70, 56, 82, 64], index)}%` }} />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Activity entries: a dot on the line, who did what, and when. */
export function SkeletonTimeline({ entries = 4, label }: { entries?: number; label?: string }) {
  return (
    <Loading label={label} className="space-y-3 py-1">
      {Array.from({ length: entries }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3" style={{ width: `${pick([64, 48, 72, 56], index)}%` }} />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** The camera panel while its module loads: the preview, then its buttons. */
export function SkeletonCamera({ label }: { label?: string }) {
  return (
    <Loading label={label} className="flex flex-1 flex-col gap-3 p-4">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex justify-center gap-3">
        <Skeleton className="h-9 w-28 rounded-[8px]" />
        <Skeleton className="h-9 w-28 rounded-[8px]" />
      </div>
    </Loading>
  );
}
