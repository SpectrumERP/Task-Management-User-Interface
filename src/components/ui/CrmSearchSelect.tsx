import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { InlineLoader } from '@/components/ui/InlineLoader';
import { Skeleton, SkeletonOptions } from '@/components/ui/skeleton';

/**
 * Searchable dropdown with the Spectrum CRM behaviour and look (CRM `ui/forms/SearchSelect`):
 * type straight into the field to search, ↑/↓ + Enter to pick, Esc / Tab / outside click to close,
 * opens on (and scrolls to) the selected option, selected row tinted with a CRM-blue bar, × to clear.
 *
 * Every Task dropdown (Combobox, UserCombobox, LocationCombobox, MultiSelect, MultiUserCombobox)
 * renders through this, so they all behave the same. Radix Popover only positions the panel, so it
 * works inside dialogs (portalled into the open dialog, like before).
 */
export interface CrmSearchSelectProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  /** Plain text used for the field, local search and the default option row. */
  getLabel: (item: T) => string;
  /** Extra text matched by local search (e.g. login id, email). */
  getSearchText?: (item: T) => string;
  /** Keys currently selected (one for single-select). */
  selectedKeys: readonly string[];
  /** Pick (single) or toggle (multiple). */
  onSelect: (item: T) => void;
  onClear?: () => void;
  multiple?: boolean;
  /** Field text when closed (single: the selected label; multiple: "2 selected"). */
  displayLabel?: string;
  /** Rich closed-field content instead of the text (e.g. a colour chip). */
  renderValue?: React.ReactNode;
  renderOption?: (item: T, selected: boolean) => React.ReactNode;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  /** Typed text, as it changes. */
  onQueryChange?: (query: string) => void;
  /** Server-side search: `items` are already the matches, so skip the local filter. */
  serverSearch?: boolean;
  loading?: boolean;
  loadingText?: string;
  /** The options are on their way (they depend on another field): a skeleton bar in the field instead of its text. */
  valueLoading?: boolean;
  /** Sticky row above the options (e.g. column titles of a wide lookup). */
  header?: React.ReactNode;
  /** Row under the list (e.g. "+ Add New", "Clear"); a function gets `close` to shut the list. */
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode);
  onOpenChange?: (open: boolean) => void;
  /** Field classes (height, radius…) — merged onto the CRM field. */
  className?: string;
  /** Panel classes (e.g. min-w for long labels). */
  contentClassName?: string;
  modal?: boolean;
  id?: string;
  'aria-label'?: string;
}

function initialFocusIndex<T>(items: readonly T[], selected: readonly string[], getKey: (item: T) => string, searching: boolean) {
  if (searching || selected.length === 0) return 0;
  const idx = items.findIndex((item) => selected.includes(getKey(item)));
  return idx >= 0 ? idx : 0;
}

/** Keep the focused / selected option in view inside the scrolling list. */
function scrollIntoList(list: HTMLElement | null, selector: string) {
  const option = list?.querySelector<HTMLElement>(selector);
  if (!list || !option) return;
  const listRect = list.getBoundingClientRect();
  const rect = option.getBoundingClientRect();
  if (rect.top >= listRect.top && rect.bottom <= listRect.bottom) return;
  list.scrollTop += rect.top - listRect.top - (listRect.height - rect.height) / 2;
}

export function CrmSearchSelect<T>({
  items,
  getKey,
  getLabel,
  getSearchText,
  selectedKeys,
  onSelect,
  onClear,
  multiple = false,
  displayLabel,
  renderValue,
  renderOption,
  placeholder = 'Select…',
  emptyText = 'No results',
  disabled = false,
  clearable = true,
  invalid = false,
  onQueryChange,
  serverSearch = false,
  loading = false,
  loadingText = 'Searching…',
  valueLoading = false,
  header,
  footer,
  onOpenChange,
  className,
  contentClassName,
  modal = false,
  id,
  'aria-label': ariaLabel,
}: CrmSearchSelectProps<T>) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [focusIdx, setFocusIdx] = React.useState(0);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || serverSearch) return [...items];
    return items.filter((item) =>
      `${getLabel(item)} ${getSearchText?.(item) ?? ''}`.toLowerCase().includes(q)
    );
  }, [items, query, getLabel, getSearchText, serverSearch]);

  const hasValue = selectedKeys.length > 0;

  function updateQuery(next: string) {
    setQuery(next);
    onQueryChange?.(next);
  }

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    if (next) {
      // Inside a dialog, portal into it so its focus trap / scroll lock keep working.
      setContainer((rootRef.current?.closest('[role="dialog"]') as HTMLElement | null) ?? null);
    } else if (query) {
      updateQuery('');
    }
  }

  // Open on the selected option; a search starts from the first match.
  React.useEffect(() => {
    if (open) setFocusIdx(initialFocusIndex(filtered, selectedKeys, getKey, Boolean(query.trim())));
    // Only when the list opens or the search changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => scrollIntoList(listRef.current, '[aria-selected="true"]'));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    if (open) scrollIntoList(listRef.current, `[data-index="${focusIdx}"]`);
  }, [focusIdx, open]);

  function pick(item: T) {
    onSelect(item);
    if (multiple) {
      updateQuery('');
      inputRef.current?.focus();
      return;
    }
    setOpenState(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') {
      setOpenState(false);
      return;
    }
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      setOpenState(true);
      return;
    }
    if (!open) return;
    const count = Math.max(filtered.length, 1);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpenState(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusIdx((idx) => (idx + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIdx((idx) => (idx - 1 + count) % count);
    } else if (event.key === 'Enter' && filtered[focusIdx]) {
      event.preventDefault();
      pick(filtered[focusIdx]);
    }
  }

  const closedText = displayLabel ?? '';
  const showRichValue = !open && renderValue != null && hasValue;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpenState} modal={modal}>
      <PopoverPrimitive.Anchor asChild>
        <div
          ref={rootRef}
          className={cn(
            'crm-select-field relative flex h-9 w-full items-center gap-2 rounded-md border border-tm-border bg-tm-input px-3 text-[12px] shadow-tm-control transition-[border-color,box-shadow]',
            !disabled && 'cursor-text',
            open && 'border-[#1E56A0] ring-[3px] ring-[rgba(41,85,163,0.22)]',
            invalid && '!border-red-500',
            disabled && 'cursor-not-allowed bg-tm-elevated opacity-100',
            className
          )}
          onClick={() => {
            if (disabled) return;
            inputRef.current?.focus();
            if (!open) setOpenState(true);
          }}
        >
          {showRichValue ? <div className="pointer-events-none min-w-0 shrink truncate">{renderValue}</div> : null}
          {valueLoading && !open ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 right-9 z-[1] flex items-center">
              <Skeleton className="h-2.5 w-2/3 max-w-40" />
            </span>
          ) : null}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            aria-busy={valueLoading || undefined}
            // Closed: the selected label; open: what is typed, with the selected label as the hint.
            value={open ? query : showRichValue ? '' : closedText}
            placeholder={valueLoading && !open ? '' : showRichValue ? '' : hasValue && closedText ? closedText : placeholder}
            className={cn(
              'crm-select-input min-w-0 flex-1 bg-transparent text-[12px] text-tm-input-fg outline-none placeholder:text-tm-placeholder',
              disabled && 'cursor-not-allowed',
              hasValue && !open && 'font-medium'
            )}
            onFocus={() => !disabled && !open && setOpenState(true)}
            onChange={(event) => {
              updateQuery(event.target.value);
              if (!open) setOpenState(true);
            }}
            onKeyDown={onKeyDown}
          />
          {hasValue && clearable && !disabled && onClear ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear"
              title="Clear"
              className="crm-select-clear grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded text-base leading-none text-[#94a3b8] hover:bg-[var(--tm-muted)] hover:text-slate-300"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
                if (open) inputRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : (
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className={cn('shrink-0 text-[#94a3b8] transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal container={container ?? document.body}>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // Clicks in the field keep the list open (the field toggles it itself).
            if (rootRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
          className={cn(
            'crm-select-panel z-[100] flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-tm-input-fg outline-none pointer-events-auto',
            'shadow-[0_16px_48px_rgba(12,26,58,0.18)] dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            contentClassName
          )}
          // At least as wide as the field; grows to fit its options (up to 40rem / the space on screen)
          // so names and emails aren't cut off. What still doesn't fit wraps (see .crm-select-panel CSS).
          style={{
            width: 'max-content',
            minWidth: 'var(--radix-popover-trigger-width)',
            maxWidth: 'min(40rem, var(--radix-popover-content-available-width))',
            maxHeight: 'min(320px, var(--radix-popover-content-available-height))',
          }}
        >
          {header ? <div className="shrink-0">{header}</div> : null}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
          >
            {loading && filtered.length === 0 ? (
              <SkeletonOptions rows={5} label={loadingText} />
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#94a3b8]">{emptyText}</p>
            ) : (
              filtered.map((item, idx) => {
                const key = getKey(item);
                const selected = selectedKeys.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    data-index={idx}
                    aria-selected={selected}
                    // CRM: selected = soft blue with a primary bar; pointer / arrow-key row = slate tint.
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                      selected
                        ? 'bg-[#eef3fc] shadow-[inset_3px_0_0_#1E56A0] dark:bg-[#1E56A0]/20'
                        : idx === focusIdx
                          ? 'bg-[#F1F5F9] dark:bg-[var(--tm-muted)]'
                          : 'bg-transparent'
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setFocusIdx(idx)}
                    onClick={() => pick(item)}
                  >
                    {multiple ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border',
                          selected ? 'border-[#1E56A0] bg-[#1E56A0] text-white' : 'border-[#CBD5E1] bg-white dark:border-[var(--tm-border)] dark:bg-transparent'
                        )}
                      >
                        {selected ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                        ) : null}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      {renderOption ? (
                        renderOption(item, selected)
                      ) : (
                        <span className={cn('block truncate text-xs font-semibold', selected ? 'text-[#1E56A0] dark:text-[#4f86d1]' : 'text-[#0c1a3a] dark:text-slate-100')}>
                          {getLabel(item)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
            {loading && filtered.length > 0 ? (
              <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-[#94a3b8]" role="status">
                <InlineLoader size={12} />
                {loadingText}
              </p>
            ) : null}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-[#EEF2F6] dark:border-[var(--tm-border)]">
              {typeof footer === 'function' ? footer(() => setOpenState(false)) : footer}
            </div>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
