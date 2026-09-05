import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DONE_KEY = 'tm-onboarding-spotlight-done';
const PENDING_KEY = 'tm-pending-onboarding';
const FORCE_KEY = 'tm-force-onboarding';

export function markOnboardingPending() {
  try {
    // Login ke baad tour queue — pehle se DONE ho to skip
    if (localStorage.getItem(DONE_KEY) === '1') return;
    sessionStorage.setItem(PENDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Help (?) se dubara tour chalane ke liye */
export function forceStartOnboardingTour() {
  try {
    localStorage.removeItem(DONE_KEY);
    sessionStorage.setItem(FORCE_KEY, '1');
    sessionStorage.setItem(PENDING_KEY, '1');
    window.dispatchEvent(new Event('tm-start-onboarding'));
  } catch {
    /* ignore */
  }
}

export function shouldStartOnboardingTour() {
  try {
    if (sessionStorage.getItem(FORCE_KEY) === '1') return true;
    if (localStorage.getItem(DONE_KEY) === '1') return false;
    // Pending after login, OR first-ever visit (no done flag)
    return sessionStorage.getItem(PENDING_KEY) === '1' || localStorage.getItem(DONE_KEY) !== '1';
  } catch {
    return true;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(DONE_KEY, '1');
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(FORCE_KEY);
  } catch {
    /* ignore */
  }
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
    body: 'Ye left sidebar hai — yahan se app ke saare modules open hote hain. Icons pe click karke section badlo.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-tasks"]',
    title: 'Tasks List',
    body: 'Main home screen. Yahan tasks list, board aur calendar views milte hain — create / update task yahi se start hota hai.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-deal-monitor"]',
    title: 'Deal Monitor',
    body: 'Deals aur sales progress track karne ke liye. Monitor icon se Deal Monitor page khulta hai.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-notes"]',
    title: 'Meeting Notes',
    body: 'Meetings schedule / notes yahan se manage karo. Calendar icon Meeting Notes module kholta hai.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-reports"]',
    title: 'MIS Task Report',
    body: 'Task progress aur MIS reports yahan se dekho. Document icon pe click karke report filters use kar sakte ho.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-reports"]',
    title: 'MIS Meeting Report',
    body: 'Meeting-related MIS report yahan milta hai — meeting progress / summary ke liye.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-master"]',
    title: 'Master Data',
    body: 'Categories, Types, Priorities, Company, Locations wagaira master records yahan se add / edit karo.',
    prefer: 'right',
  },
  {
    target: '[data-tour="nav-meeting-masters"]',
    title: 'Meeting Masters',
    body: 'Meeting Category aur Meeting Types ke masters yahan hain — meeting setup ke liye.',
    prefer: 'right',
  },
  {
    target: '[data-tour="sidebar-toggle"]',
    title: 'Sidebar collapse',
    body: 'Is arrow se left menu icons-only / full labels toggle karo. Zyada space chahiye to collapse rakho.',
    prefer: 'right',
  },
  {
    target: '[data-tour="fullscreen"]',
    title: 'Full screen mode',
    body: 'Yahan se Full screen on karo — left sidebar band ho jati hai aur workspace zyada wide milta hai. Menu se wapas open kar sakte ho.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="help"]',
    title: 'Spectrum Guide',
    body: 'Kabhi bhi (?) ya profile menu se Spectrum Guide dubara chala sakte ho.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="theme"]',
    title: 'Theme toggle',
    body: 'Dark / Light theme yahan se switch karo.',
    prefer: 'bottom',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Your profile',
    body: 'Logged-in account yahan dikhta hai — Log out aur Spectrum Guide yahi menu se.',
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

interface OnboardingSpotlightTourProps {
  startDelayMs?: number;
}

export function OnboardingSpotlightTour({ startDelayMs = 900 }: OnboardingSpotlightTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pulse, setPulse] = useState(false);
  const retryRef = useRef(0);

  const finish = useCallback(() => {
    markOnboardingDone();
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
    const tryStart = () => {
      if (!shouldStartOnboardingTour()) return;
      if (beginTour()) return;
      // Keep trying while layout boots (sidebar / rights load)
      if (retryRef.current < 20) {
        retryRef.current += 1;
        window.setTimeout(tryStart, 400);
      }
    };

    const t = window.setTimeout(tryStart, startDelayMs);
    const onForce = () => {
      retryRef.current = 0;
      window.setTimeout(tryStart, 100);
    };
    window.addEventListener('tm-start-onboarding', onForce);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('tm-start-onboarding', onForce);
    };
  }, [startDelayMs, beginTour]);

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
