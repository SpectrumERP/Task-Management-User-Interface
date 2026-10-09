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
