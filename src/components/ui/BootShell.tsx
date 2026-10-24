import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useSkeletonPhase } from '@/hooks/useSkeletonPhase';

const SIDE_ITEMS = [62, 48, 70, 54, 66, 44, 58];
const COLUMNS = [18, 26, 14, 16, 12];
const ROW_SHIFTS = [
  [0, 0, 0, 0, 0],
  [-4, 6, 2, -3, 1],
  [3, -6, 4, 0, -2],
  [-2, 2, -3, 4, 0],
  [1, -4, 0, -2, 3],
  [-3, 4, 2, 1, -1],
  [2, 0, -4, 3, 0],
  [0, -2, 3, -4, 2],
];

/**
 * The loading screen: the app's shape in skeleton bars — blue sidebar, header, a list page — or, `login`, the
 * Spectrum ERP sign-in page's (on the way there). Same markup as index.html (styles live there, and in the ERP
 * shell's index.html when embedded), so a session / workspace check never flashes a blank page or a jump.
 */
export function BootShell({ label = 'Loading', login = false }: { label?: string; login?: boolean }) {
  return (
    <div className={cn('boot-shell', login && 'boot-login-shell')} role="status" aria-busy="true" aria-live="polite" aria-label={label}>
      <div className="boot-side" aria-hidden="true">
        <div className="boot-side-logo">
          <Bar width="120px" height={22} />
        </div>
        <div className="boot-side-nav">
          {SIDE_ITEMS.map((width) => (
            <div key={width} className="boot-side-item">
              <Bar width="24px" height={24} style={{ flexShrink: 0, borderRadius: 6 }} />
              <Bar width={`${width}%`} height={11} className="bsk-label" />
            </div>
          ))}
        </div>
      </div>
      <div className="boot-main">
        <div className="boot-head" aria-hidden="true">
          <Bar width="140px" height={16} />
          <span className="boot-head-search">
            <Bar width="min(22rem, 36vw)" height={36} />
          </span>
          <span className="boot-head-actions">
            {[0, 1, 2, 3].map((index) => (
              <Bar key={index} width="32px" height={32} className="bsk-round" />
            ))}
          </span>
        </div>
        {/* Only the shape in use (index.html carries both and lets CSS pick before React runs). */}
        <div className="boot-body" aria-hidden="true">
          {!login && (
            <div className="boot-page">
              <div className="boot-strip">
                <Bar width="64px" />
                <Bar width="120px" />
              </div>
              <div className="boot-band">
                <Bar width="180px" height={20} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bar width="min(24rem, 60%)" height={36} style={{ borderRadius: 8 }} />
                  <span style={{ flex: 1 }} />
                  <Bar width="84px" height={34} style={{ borderRadius: 8 }} />
                  <Bar width="96px" height={34} style={{ borderRadius: 8 }} />
                </div>
              </div>
              <div className="boot-panel">
                <div className="boot-panel-head">
                  {COLUMNS.map((width) => (
                    <Bar key={width} width={`${Math.round(width * 0.6)}%`} height={10} />
                  ))}
                </div>
                {ROW_SHIFTS.map((shifts, row) => (
                  <div key={row} className="boot-row">
                    {COLUMNS.map((width, at) => (
                      <Bar key={at} width={`${width + shifts[at]}%`} height={13} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {login && (
            <div className="boot-signin">
              <div className="boot-brand">
                <Bar width="160px" height={40} />
                <span style={{ flex: 1 }} />
                <Bar width="70%" height={28} />
                <Bar width="55%" height={28} />
                <Bar width="80%" />
                <Bar width="64%" />
                <span style={{ flex: 1 }} />
              </div>
              <div className="boot-form">
                <Bar width="150px" height={24} />
                <Bar width="220px" />
                <span style={{ height: 12 }} />
                <Bar width="80px" />
                <Bar width="100%" height={42} style={{ borderRadius: 8 }} />
                <span style={{ height: 4 }} />
                <Bar width="72px" />
                <Bar width="100%" height={42} style={{ borderRadius: 8 }} />
                <span style={{ height: 10 }} />
                <Bar width="100%" height={44} style={{ borderRadius: 8 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One skeleton bar (.bsk in index.html), its light in step with the bars index.html painted. */
function Bar({ width, height = 12, className, style }: { width: string; height?: number; className?: string; style?: CSSProperties }) {
  const phase = useSkeletonPhase();
  return <span className={cn('bsk', className)} style={{ ...phase, width, height, ...style }} />;
}
