import { cn } from '@/lib/utils';

export const MODULE_NAME = 'Task Management';

/** This module's name in place of the Spectrum ERP logo: white on the blue rail, blue in the white header. */
export function ModuleTitle({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span
      title={MODULE_NAME}
      className={cn(
        'block min-w-0 truncate text-[15px] font-semibold leading-tight tracking-tight',
        tone === 'dark' ? 'text-white' : 'text-[#1E56A0] dark:text-white',
        className
      )}
    >
      {MODULE_NAME}
    </span>
  );
}
