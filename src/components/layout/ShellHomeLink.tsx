import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IN_SPECTRUM, openInSpectrum } from '@/lib/crmSso';

function openShellDashboard(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  openInSpectrum('/');
}

/**
 * Inside Spectrum ERP the Spectrum ERP logo goes back to the shell's main dashboard (as in the shell's
 * own header). Standalone it stays a plain logo.
 */
export function ShellHomeLink({ className, children }: { className?: string; children: ReactNode }) {
  if (!IN_SPECTRUM) return <>{children}</>;
  return (
    <a
      href="/"
      onClick={openShellDashboard}
      aria-label="Spectrum ERP home"
      className={cn('rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E56A0]', className)}
    >
      {children}
    </a>
  );
}

/** "Main dashboard" button for the header, inside Spectrum ERP only. */
export function ShellHomeButton({ className }: { className?: string }) {
  if (!IN_SPECTRUM) return null;
  return (
    <a href="/" onClick={openShellDashboard} aria-label="Main dashboard" className={cn('inline-flex items-center justify-center', className)}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    </a>
  );
}
