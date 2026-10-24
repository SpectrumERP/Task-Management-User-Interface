import { useState, type CSSProperties } from 'react';

/** One pass of the skeleton light, in ms: index.css's tm-skeleton-sweep and index.html's boot-sweep last as long. */
export const SKELETON_PERIOD = 2000;

/**
 * Where the skeleton light is now, as a negative animation delay (--skeleton-phase): a bar that mounts late starts
 * mid-sweep, in step with the bars already on screen and with index.html's loading screen, instead of starting a sweep
 * of its own (a flicker). The clock is the one CSS animations run on (document.timeline). Read once per bar: a delay
 * that changed on a re-render would make its light jump.
 */
export function useSkeletonPhase(): CSSProperties {
  const [phase] = useState(() => {
    const now = Number(document.timeline?.currentTime ?? performance.now());
    return { '--skeleton-phase': `-${Math.round(now % SKELETON_PERIOD)}ms` } as CSSProperties;
  });
  return phase;
}
