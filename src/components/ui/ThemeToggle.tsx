import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/lib/utils';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';

interface ThemeToggleProps {
  className?: string;
  /** Kept for callers — always renders icon-only control */
  variant?: 'chip' | 'switch' | 'icon' | 'segment';
  size?: 'sm' | 'md';
}

/**
 * Icon-only theme toggle: shows the theme you will switch to.
 * Dark mode → sun (go light). Light mode → moon (go dark).
 */
export function ThemeToggle({
  className,
  size: _size = 'sm',
}: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const label = isDark ? 'Light theme' : 'Dark theme';
  const iconSize = 15;

  return (
    <ActionTip label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={label}
        onClick={toggleTheme}
        className={cn(
          'theme-toggle relative inline-flex shrink-0 items-center justify-center overflow-hidden',
          'border border-brand/45 bg-brand/10 text-brand-hover',
          'shadow-none',
          'hover:bg-brand/20 hover:text-[#0369A1]',
          'dark:border-brand-hover/40 dark:bg-brand/15 dark:text-[#7DD3FC]',
          'dark:hover:bg-brand/25 dark:hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-tm-surface',
          'transition-colors duration-200',
          'h-9 w-9 rounded-md',
          className
        )}
        data-tour="theme"
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <Sun
            size={iconSize}
            strokeWidth={2.25}
            className={cn(
              'absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isDark
                ? 'translate-y-0 scale-100 opacity-100 rotate-0'
                : 'translate-y-4 scale-50 opacity-0 rotate-90'
            )}
          />
          <Moon
            size={iconSize}
            strokeWidth={2.25}
            className={cn(
              'absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isDark
                ? 'translate-y-4 scale-50 opacity-0 -rotate-90'
                : 'translate-y-0 scale-100 opacity-100 rotate-0'
            )}
          />
        </span>
      </button>
    </ActionTip>
  );
}
