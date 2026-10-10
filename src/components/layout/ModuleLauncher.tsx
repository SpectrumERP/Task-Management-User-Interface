import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ActionTip } from '@/components/master/shared/TruncatedCellTip'
import { CRM_SSO_ENABLED, crmHomeUrl, IN_SPECTRUM, openInSpectrum } from '@/lib/crmSso'
import { prerenderApp } from '@/lib/prerenderApp'

/**
 * Spectrum ERP module launcher (the "waffle" next to the sidebar toggle) — Microsoft 365 style,
 * Spectrum CRM theme. Add a future ERP module by adding one entry to MODULES; the CRM has the
 * same list (src/components/ModuleLauncher.tsx there) — keep the two in step.
 */
interface ErpModule {
  id: string
  label: string
  description: string
  /** Tile colour (CRM palette). */
  color: string
  icon: ReactNode
  /** In-app route (this Task app) or a path of another app on this origin. */
  to: string
  /** Another app: open with a full page load (and prerender on hover). */
  external?: boolean
}

const glyph = {
  width: 22,
  height: 22,
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const MODULES: ErpModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview and KPIs',
    color: '#1E56A0',
    // Inside Spectrum ERP: the shell's home. On its own: the CRM dashboard.
    to: IN_SPECTRUM ? '/' : crmHomeUrl,
    external: true,
    icon: (
      <svg {...glyph}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Leads, opportunities, contacts',
    color: '#0e7490',
    // Inside Spectrum ERP the CRM opens on its Sales Dashboard (the Dashboard tile is the shell's home).
    to: IN_SPECTRUM ? crmHomeUrl : `${crmHomeUrl}leads`,
    external: true,
    icon: (
      <svg {...glyph}>
        {/* Handshake — the CRM icon in the sidebar (lucide "handshake") */}
        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
        <path d="m21 3 1 11h-2" />
        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
        <path d="M3 4h8" />
      </svg>
    ),
  },
  {
    id: 'task',
    label: 'Task',
    description: 'Tasks, meetings, reports',
    color: '#7c3aed',
    to: '/',
    icon: (
      <svg {...glyph}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    ),
  },
]

function WaffleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      {[2, 8, 14].flatMap((y) => [2, 8, 14].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
    </svg>
  )
}

/** `tone="dark"`: on the blue left rail, before the logo (as in the Spectrum ERP shell). */
export function ModuleLauncher({ tone = 'light' }: { tone?: 'light' | 'dark' } = {}) {
  const activeModule = 'task'
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  // The panel is portalled to <body> at a fixed spot under the button, so page toolbars (z-40 etc.)
  // can never paint over it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(352, window.innerWidth - 32)
      setPos({ top: rect.bottom + 8, left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Standalone Task (no CRM on this origin): only the Task tile.
    const list = CRM_SSO_ENABLED ? MODULES : MODULES.filter((m) => !m.external)
    if (!q) return list
    return list.filter((m) => `${m.label} ${m.description}`.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function onPointer(e: MouseEvent) {
      const target = e.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openModule(m: ErpModule) {
    setOpen(false)
    setQuery('')
    if (m.external) {
      if (IN_SPECTRUM) openInSpectrum(m.to)
      else window.location.assign(m.to)
      return
    }
    navigate(m.to)
  }

  return (
    <div ref={rootRef} className="relative">
      <ActionTip label="Spectrum ERP apps" side="bottom">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Spectrum ERP apps"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-200 ease-out active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${
            tone === 'dark'
              ? `text-white focus-visible:outline-white ${open ? 'border-white/40 bg-white/20' : 'border-white/15 bg-white/10 hover:border-white/30 hover:bg-white/20'}`
              : `text-[#1E56A0] dark:text-[#4f86d1] focus-visible:outline-[#1E56A0] ${
                  open ? 'border-[#1E56A0] bg-[#eef3fc] dark:bg-[#1E56A0]/20' : 'border-[#CBD5E1] bg-[#eef3fc] hover:border-[#1E56A0] dark:border-[var(--tm-border)] dark:bg-[#1E56A0]/20'
                }`
          }`}
        >
          <WaffleIcon />
        </button>
      </ActionTip>

      {open && pos ? createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Spectrum ERP apps"
          data-state="open"
          className="crm-menu-anim fixed z-[200] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(12,26,58,0.18)] dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)]"
          style={{ top: pos.top, left: pos.left, transformOrigin: 'top left' }}
        >
          <div className="border-b border-[#EEF2F6] p-3 dark:border-[var(--tm-border)]">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find Spectrum ERP apps"
                aria-label="Find Spectrum ERP apps"
                className="crm-search-input w-full h-8 rounded-lg border pl-8 pr-3 text-xs outline-none"
              />
            </div>
          </div>

          <div className="p-3">
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#7a8494] dark:text-slate-400">Apps</p>
            {shown.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-[#7a8494] dark:text-slate-400">No apps match “{query.trim()}”.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-1">
                {shown.map((m) => {
                  const current = m.id === activeModule
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => openModule(m)}
                        onPointerEnter={m.external && !IN_SPECTRUM ? () => prerenderApp(m.to) : undefined}
                        onFocus={m.external && !IN_SPECTRUM ? () => prerenderApp(m.to) : undefined}
                        aria-current={current ? 'page' : undefined}
                        title={m.description}
                        className={`flex w-full flex-col items-center gap-2 rounded-lg px-2 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0] ${
                          current ? 'bg-[#eef3fc] dark:bg-[#1E56A0]/20' : 'hover:bg-[#F1F5F9] dark:hover:bg-[var(--tm-muted)]'
                        }`}
                      >
                        <span
                          className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm"
                          style={{ backgroundImage: `linear-gradient(135deg, ${m.color}, color-mix(in srgb, ${m.color} 70%, #0c1a3a))` }}
                        >
                          {m.icon}
                        </span>
                        <span className={`text-[12.5px] font-semibold ${current ? 'text-[#1E56A0] dark:text-[#4f86d1]' : 'text-[#0c1a3a] dark:text-slate-100'}`}>{m.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
