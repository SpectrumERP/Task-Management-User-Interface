import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PersonHoverCard } from '@/components/ui/PersonHoverCard';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { cn } from '@/lib/utils';
import { getUserInitials } from '@/lib/userProfile';
import { userRef } from '@/lib/personDetails';

interface UserAvatarProps {
  loginNo?: number | null;
  displayName?: string;
  initials?: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'default';
  /** Show display name next to avatar; hovering or clicking the name opens the same profile card. */
  showName?: boolean;
  nameClassName?: string;
}

/** Initials avatar for a login user. Hover (or click / tap) shows their profile card. */
export function UserAvatar({
  loginNo,
  displayName,
  initials,
  className,
  fallbackClassName,
  size = 'default',
  showName = false,
  nameClassName,
}: UserAvatarProps) {
  const person = userRef(loginNo);
  const sizeClasses = {
    sm: 'h-6 w-6 text-[8px]',
    md: 'h-7 w-7 text-[10px]',
    default: 'h-8 w-8 text-xs',
    lg: 'h-9 w-9 text-xs',
  }[size];

  const avatar = (
    <button
      type="button"
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 select-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 shrink-0',
        showName &&
          'rounded-[8px] gap-1.5 max-w-full hover:scale-100 hover:bg-[var(--tm-muted)]/70 px-1 py-0.5 -mx-1',
        !showName && sizeClasses,
        className
      )}
    >
      <Avatar className={cn('pointer-events-none shrink-0', showName ? sizeClasses : 'h-full w-full')}>
        <AvatarFallback
          className={cn(
            'bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-white font-semibold uppercase tracking-wide h-full w-full flex items-center justify-center shadow-sm shadow-[#0EA5E9]/10',
            fallbackClassName
          )}
        >
          {getUserInitials(displayName, initials)}
        </AvatarFallback>
      </Avatar>
      {showName ? (
        <span className={cn('min-w-0 truncate text-left text-xs font-semibold text-slate-200', nameClassName)}>
          {displayName || 'Unknown'}
        </span>
      ) : null}
    </button>
  );

  // Without a login there is no card to show: a plain tooltip names the person instead.
  if (!person) {
    const name = (displayName || '').trim();
    return !showName && name ? <ActionTip label={name}>{avatar}</ActionTip> : avatar;
  }

  return (
    <PersonHoverCard person={person} name={displayName} openOnClick className={cn(showName ? 'max-w-full' : 'shrink-0')}>
      {avatar}
    </PersonHoverCard>
  );
}
