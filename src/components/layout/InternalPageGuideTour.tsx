import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPageGuide, resolveActivePageGuideKey, type PageGuideStep } from '@/guides/pageGuides';
import { toast } from 'sonner';

const START_EVENT = 'tm-start-page-guide';

/** User click se current (ya forced) page / modal ka inner guide start */
export function forceStartPageGuide(guideKey?: string) {
  window.dispatchEvent(
    new CustomEvent(START_EVENT, { detail: { guideKey: guideKey || null } })
  );
}

type Rect = { top: number; left: number; width: number; height: number };

function getTargetElement(selector: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  let best: HTMLElement | null = null;
  let bestScore = -1;
  for (const el of nodes) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // Prefer fully on-screen, then largest area (stable for single matches)
    const visibleH = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    const visibleW = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
    const visibleArea = Math.max(0, visibleH) * Math.max(0, visibleW);
    const area = r.width * r.height;
    const score = visibleArea > 0 ? area + visibleArea : area * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function getTargetRect(selector: string): Rect | null {
  const best = getTargetElement(selector);
  if (!best) return null;
  const r = best.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function scrollTargetIntoView(selector: string) {
  const el = getTargetElement(selector);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const margin = 96;
  const fullyVisible =
    r.top >= margin &&
    r.bottom <= window.innerHeight - margin &&
    r.left >= 8 &&
    r.right <= window.innerWidth - 8;
  if (fullyVisible) return;
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

function findNextStepIndex(steps: PageGuideStep[], fromIndex: number): number {
  for (let i = fromIndex; i < steps.length; i++) {
    if (getTargetRect(steps[i].target)) return i;
  }
  return -1;
}

/**
 * Inner-section page guide — NEVER auto-starts.
 * Only runs when forceStartPageGuide() / menu / toolbar click fires.
 */
export function InternalPageGuideTour() {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pulse, setPulse] = useState(false);
  const prevPathRef = useRef(location.pathname);

  const guide = getPageGuide(guideKey);
  const steps = guide?.steps ?? [];
  const step = steps[stepIndex];

  const finish = useCallback(() => {
    setActive(false);
    setPulse(false);
    setRect(null);
    setGuideKey(null);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<{ guideKey?: string | null }>).detail;
      const key =
        detail?.guideKey ||
        resolveActivePageGuideKey(location.pathname) ||
        null;
      const def = getPageGuide(key);
      if (!def || def.steps.length === 0) {
        toast.message('Page Guide', {
          description: 'Is screen / modal ke liye abhi koi inner guide available nahi hai.',
        });
        return;
      }

      // Wait a tick so dropdowns close / layout settles
      window.setTimeout(() => {
        const idx = findNextStepIndex(def.steps, 0);
        if (idx < 0) {
          toast.message(def.title, {
            description: 'Guide targets abhi screen pe nahi dikh rahe. Page load hone do, phir try karo.',
          });
          return;
        }
        setGuideKey(key);
        setStepIndex(idx);
        setActive(true);
      }, 100);
    };

    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [location.pathname]);

  // Leave page → close guide
  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;
    finish();
  }, [location.pathname, finish]);

  useEffect(() => {
    if (!active || !step) return;

    let cancelled = false;
    let measureTimer: number | null = null;

    const measure = () => {
      if (cancelled) return;
      const r = getTargetRect(step.target);
      if (r) {
        setRect(r);
        setPulse(true);
        return;
      }
      const next = findNextStepIndex(steps, stepIndex + 1);
      if (next >= 0) {
        setStepIndex(next);
        return;
      }
      finish();
    };

    scrollTargetIntoView(step.target);
    measureTimer = window.setTimeout(measure, 180);

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelled = true;
      if (measureTimer != null) window.clearTimeout(measureTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, stepIndex, steps, finish]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active || !guide || !step || !rect) return null;

  const pad = 6;
  const hole = {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  const cardWidth = Math.min(320, window.innerWidth - 24);
  let cardTop = hole.top + hole.height + 12;
  let cardLeft = hole.left;

  if (step.prefer === 'left') {
    cardLeft = Math.max(12, hole.left - cardWidth - 12);
    cardTop = hole.top;
  } else if (step.prefer === 'right') {
    cardLeft = Math.min(window.innerWidth - cardWidth - 12, hole.left + hole.width + 12);
    cardTop = hole.top;
  } else if (step.prefer === 'top') {
    cardTop = Math.max(12, hole.top - 168);
    cardLeft = hole.left;
  }

  if (cardTop + 168 > window.innerHeight) {
    cardTop = Math.max(12, hole.top - 176);
  }
  if (cardLeft + cardWidth > window.innerWidth - 12) {
    cardLeft = window.innerWidth - cardWidth - 12;
  }
  if (cardLeft < 12) cardLeft = 12;

  const isLast = findNextStepIndex(steps, stepIndex + 1) < 0;

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setPulse(false);
    const next = findNextStepIndex(steps, stepIndex + 1);
    window.setTimeout(() => {
      if (next < 0) finish();
      else setStepIndex(next);
    }, 120);
  };

  const goBack = () => {
    setPulse(false);
    for (let i = stepIndex - 1; i >= 0; i--) {
      if (getTargetRect(steps[i].target)) {
        window.setTimeout(() => setStepIndex(i), 100);
        return;
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label={guide.title}>
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
          pulse && 'tm-page-tour-pulse'
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
        <div className="rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-[0_20px_50px_-16px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="px-3.5 pt-3 pb-0">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#0EA5E9]">
                {guide.title}
                <span className="ml-1.5 font-semibold tracking-normal text-slate-500 normal-case">
                  {stepIndex + 1}/{steps.length}
                </span>
              </p>
              <button
                type="button"
                onClick={finish}
                className="shrink-0 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip
              </button>
            </div>
            <h3 className="mt-1 text-[13px] font-bold leading-snug text-slate-100">{step.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{step.body}</p>
          </div>
          <div className="px-3.5 pt-3 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {steps.map((_, i) => (
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
        @keyframes tm-page-tour-pulse-kf {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.85; }
        }
        .tm-page-tour-pulse {
          animation: tm-page-tour-pulse-kf 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body
  );
}
