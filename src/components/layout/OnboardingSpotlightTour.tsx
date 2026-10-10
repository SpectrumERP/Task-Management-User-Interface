import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const START_EVENT = 'tm-start-onboarding';

/** Tour sirf Help (?) button click pe chalta hai — kabhi auto-start nahi */
export function forceStartOnboardingTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

type TourStep = {
  target: string;
  title: string;
  body: string;
  prefer: 'bottom' | 'left' | 'right';
};

const STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Left navigation',
    body: 'This is the left sidebar — from here all application modules are opened. Click the icons to switch sections.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-tasks"]',
    title: 'Tasks List',
    body: 'Main home screen. Here you will find the tasks list, board, and calendar views — creating or updating a task starts from here.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-deal-monitor"]',
    title: 'Deal Monitor',
    body: 'Used to track deals and sales progress. The monitor icon opens the Deal Monitor page.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-notes"]',
    title: 'Meeting Notes',
    body: 'Manage your meeting schedules and notes from here. The calendar icon opens the Meeting Notes module.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-reports"]',
    title: 'MIS Task Report',
    body: 'View task progress and MIS reports from here. Click the document icon to use report filters.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-reports"]',
    title: 'MIS Meeting Report',
    body: 'You can find meeting-related MIS reports here — useful for checking meeting progress and summaries.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-master"]',
    title: 'Master Data',
    body: 'Add or edit master records such as Categories, Types, Priorities, Companies, Locations, etc. from here.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-masters"]',
    title: 'Meeting Masters',
    body: 'Meeting Category and Meeting Type masters are located here — used for meeting setup.',
    prefer: 'right',
  },
  {
    target: '[data-tour="sidebar-toggle"]',
    title: 'Sidebar collapse',
    body: 'Toggle the left menu between icons-only and full labels using this arrow. Keep it collapsed if you need more space.',
    prefer: 'right',
  },
  {
    target: '[data-tour="fullscreen"]',
    title: 'Full screen mode',
    body: 'Turn on Full screen from here — the left sidebar closes and the workspace becomes wider. You can open the menu back again.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="help"]',
    title: 'Spectrum Guide',
    body: 'You can restart the Spectrum Guide anytime from the (?) icon or your profile menu.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="theme"]',
    title: 'Theme toggle',
    body: 'Switch between Dark and Light themes from here.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Your profile',
    body: 'Your logged-in account is shown here — you can log out or access the Spectrum Guide from this menu.',
    prefer: 'left',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function isElementVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  // Must intersect viewport at least a bit
  if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) {
    return false;
  }
  return true;
}

function getTargetRect(selector: string): Rect | null {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  let best: HTMLElement | null = null;
  let bestArea = 0;

  for (const el of nodes) {
    if (!isElementVisible(el)) continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }

  if (!best) return null;
  const r = best.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function findNextStepIndex(fromIndex: number): number {
  for (let i = fromIndex; i < STEPS.length; i++) {
    if (getTargetRect(STEPS[i].target)) return i;
  }
  return -1;
}

export function OnboardingSpotlightTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pulse, setPulse] = useState(false);
  const retryRef = useRef(0);

  const finish = useCallback(() => {
    setActive(false);
    setPulse(false);
    setRect(null);
    retryRef.current = 0;
  }, []);

  const beginTour = useCallback(() => {
    retryRef.current = 0;
    const idx = findNextStepIndex(0);
    if (idx < 0) {
      // Layout not ready — retry shortly, do NOT mark done
      return false;
    }
    setStepIndex(idx);
    setActive(true);
    return true;
  }, []);

  useEffect(() => {
    let t: number | undefined;
    const tryStart = () => {
      if (beginTour()) return;
      // Keep trying while layout settles (dropdowns close / sidebar renders)
      if (retryRef.current < 20) {
        retryRef.current += 1;
        t = window.setTimeout(tryStart, 400);
      }
    };

    const onStart = () => {
      window.clearTimeout(t);
      retryRef.current = 0;
      t = window.setTimeout(tryStart, 100);
    };
    window.addEventListener(START_EVENT, onStart);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(START_EVENT, onStart);
    };
  }, [beginTour]);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!active || !step) return;

    const apply = () => {
      const r = getTargetRect(step.target);
      if (r) {
        setRect(r);
        setPulse(true);
        return;
      }
      // Skip missing step without ending the whole tour
      const next = findNextStepIndex(stepIndex + 1);
      if (next >= 0) {
        setStepIndex(next);
        return;
      }
      // Nothing left that is visible — end only after real progress attempt
      finish();
    };

    apply();
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, stepIndex, finish]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active || !step || !rect) return null;

  const pad = 10;
  const hole = {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  const cardWidth = Math.min(340, window.innerWidth - 24);
  let cardTop = hole.top + hole.height + 14;
  let cardLeft = hole.left;

  if (step.prefer === 'left') {
    cardLeft = Math.max(12, hole.left - cardWidth - 14);
    cardTop = hole.top;
  } else if (step.prefer === 'right') {
    cardLeft = Math.min(window.innerWidth - cardWidth - 12, hole.left + hole.width + 14);
    cardTop = hole.top;
  }

  if (cardTop + 200 > window.innerHeight) {
    cardTop = Math.max(12, hole.top - 210);
  }
  if (cardLeft + cardWidth > window.innerWidth - 12) {
    cardLeft = window.innerWidth - cardWidth - 12;
  }
  if (cardLeft < 12) cardLeft = 12;

  const isLast = findNextStepIndex(stepIndex + 1) < 0;

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setPulse(false);
    const next = findNextStepIndex(stepIndex + 1);
    window.setTimeout(() => {
      if (next < 0) finish();
      else setStepIndex(next);
    }, 120);
  };

  const goBack = () => {
    setPulse(false);
    for (let i = stepIndex - 1; i >= 0; i--) {
      if (getTargetRect(STEPS[i].target)) {
        window.setTimeout(() => setStepIndex(i), 100);
        return;
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label="Spectrum Guide">
      <div
        className="pointer-events-auto absolute rounded-xl transition-all duration-500 ease-out"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(2, 8, 23, 0.78)',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className={cn(
          'pointer-events-none absolute rounded-xl border-2 border-[#0EA5E9]',
          'transition-all duration-500 ease-out',
          pulse && 'tm-tour-pulse'
        )}
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 4px rgba(14,165,233,0.25), 0 0 24px rgba(14,165,233,0.35)',
        }}
      />

      <div
        className="pointer-events-auto absolute z-[301] animate-in fade-in-0 zoom-in-95 duration-300"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <div className="rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-[0_20px_50px_-16px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 border-b border-[var(--tm-border)]/60 bg-[var(--tm-elevated)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0EA5E9]">
                Spectrum Guide · {stepIndex + 1}/{STEPS.length}
              </p>
              <button
                type="button"
                onClick={finish}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip
              </button>
            </div>
            <h3 className="mt-1 text-[14px] font-bold text-slate-100">{step.title}</h3>
          </div>
          <div className="px-4 py-3">
            <p className="text-[12px] leading-relaxed text-slate-400">{step.body}</p>
          </div>
          <div className="px-4 pb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === stepIndex ? 'w-5 bg-[#0EA5E9]' : 'w-1.5 bg-slate-600'
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="h-8 rounded-[8px] text-xs px-3 border-[var(--tm-border)] bg-transparent"
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={goNext}
                className="h-8 rounded-[8px] text-xs font-semibold px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                {isLast ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tm-tour-pulse-kf {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.85; }
        }
        .tm-tour-pulse {
          animation: tm-tour-pulse-kf 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body
  );
}
