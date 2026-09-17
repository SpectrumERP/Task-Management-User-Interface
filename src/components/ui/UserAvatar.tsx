import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { apiService } from '@/services/apiService';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  ShieldCheck,
  Briefcase,
  Building2,
  MapPin,
  UserRound,
  BadgeCheck,
  ExternalLink,
  X,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { cn } from '@/lib/utils';
import {
  getOpenUserAvatarId,
  setOpenUserAvatarId,
  subscribeOpenUserAvatar,
} from '@/lib/openUserAvatar';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import {
  asUserDetails,
  getUserInitials,
  mapUserProfile,
  userProfilePath,
  type UserDetails,
} from '@/lib/userProfile';

/** Prefer sides that keep the profile card fully on-screen (first-row / near-header). */
function pickProfileCardSide(trigger: HTMLElement | null): 'top' | 'bottom' | 'right' {
  if (!trigger || typeof window === 'undefined') return 'bottom';
  const rect = trigger.getBoundingClientRect();
  const gap = 12;
  const chromeTop = 72; // app header / sticky table chrome
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - chromeTop - gap;
  const spaceRight = window.innerWidth - rect.right - gap;
  const minCard = 280;

  if (spaceBelow >= minCard) return 'bottom';
  if (spaceRight >= 360) return 'right';
  if (spaceAbove >= minCard) return 'top';
  // Not enough room anywhere — still open below and let collision shift/clamp
  return spaceBelow >= spaceAbove ? 'bottom' : spaceRight >= 200 ? 'right' : 'bottom';
}

interface UserAvatarProps {
  loginNo?: number | null;
  displayName?: string;
  initials?: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'default';
  /** Show display name next to avatar; clicking name opens the same profile card. */
  showName?: boolean;
  nameClassName?: string;
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  accent?: 'emerald' | 'sky';
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] ring-1',
          accent === 'emerald'
            ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
            : accent === 'sky'
              ? 'bg-[#0EA5E9]/15 text-[#0EA5E9] ring-[#0EA5E9]/25'
              : 'bg-[var(--tm-muted)] text-slate-400 ring-[var(--tm-border)]'
        )}
      >
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">{label}</p>
        <p
          className={cn(
            'text-[12px] font-medium break-words leading-snug',
            accent === 'emerald' ? 'text-emerald-400 font-semibold' : 'text-slate-100'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

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
  const instanceId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openId = useSyncExternalStore(subscribeOpenUserAvatar, getOpenUserAvatarId, () => null);
  const isOpen = openId === instanceId;
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardSide, setCardSide] = useState<'top' | 'bottom' | 'right'>('bottom');

  useEffect(() => {
    if (!isOpen || !loginNo || userDetails) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiService.get<{ success: boolean; data: UserDetails; message?: string }>(
          `/api/security/users/load-data/${loginNo}`
        );
        if (cancelled) return;
        if (response.success && response.data) {
          setUserDetails(asUserDetails(response.data) || (response.data as UserDetails));
        } else {
          setError(response.message || 'Failed to load user details.');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load user details:', err);
        setError('Error loading user details.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, loginNo, userDetails]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCardSide(pickProfileCardSide(triggerRef.current));
      setOpenUserAvatarId(instanceId);
      return;
    }
    // Only the active card may clear — avoids race when switching avatars
    if (getOpenUserAvatarId() === instanceId) {
      setOpenUserAvatarId(null);
    }
  };

  const sizeClasses = {
    sm: 'h-6 w-6 text-[8px]',
    md: 'h-7 w-7 text-[10px]',
    default: 'h-8 w-8 text-xs',
    lg: 'h-9 w-9 text-xs',
  }[size];

  const profile = mapUserProfile(userDetails, displayName);
  const finalInitials = getUserInitials(displayName, initials);
  const hoverName = !showName && !isOpen ? (displayName || '').trim() : '';

  const trigger = (
    <PopoverTrigger asChild>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105 select-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 shrink-0',
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
            {finalInitials}
          </AvatarFallback>
        </Avatar>
        {showName ? (
          <span
            className={cn(
              'min-w-0 truncate text-left text-xs font-semibold text-slate-200',
              nameClassName
            )}
          >
            {displayName || 'Unknown'}
          </span>
        ) : null}
      </button>
    </PopoverTrigger>
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal>
      {hoverName ? <ActionTip label={hoverName}>{trigger}</ActionTip> : trigger}

      {isOpen ? (
        <PopoverContent
          align="start"
          side={cardSide}
          sideOffset={8}
          collisionPadding={{ top: 80, right: 16, bottom: 24, left: 16 }}
          avoidCollisions
          sticky="partial"
          className={cn(
            'z-[9999] w-[320px] sm:w-[360px] p-0 overflow-hidden outline-none',
            'max-h-[min(28rem,calc(100dvh-5.5rem))] flex flex-col',
            'rounded-[10px]',
            'border-2 border-[#0EA5E9]/45',
            'bg-[var(--tm-elevated)] text-slate-100',
            'shadow-[0_0_0_1px_rgba(14,165,233,0.18),0_18px_50px_-12px_rgba(2,8,23,0.72),0_0_28px_-6px_rgba(14,165,233,0.35)]',
            'ring-1 ring-[#7dd3fc]/25',
            'relative data-[state=closed]:animate-none data-[state=closed]:opacity-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenUserAvatarId(null);
            }}
            aria-label="Close profile"
            className="absolute right-2.5 top-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)] transition-colors"
          >
            <X size={14} strokeWidth={2.25} />
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 pr-8">
              <BrandLoader size="sm" message="Loading profile" />
            </div>
          ) : error ? (
            <LoadErrorState
              compact
              className="pr-10"
              title="Couldn’t load profile"
              description={error}
            />
          ) : userDetails ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-start gap-3 px-4 py-3.5 pr-11 bg-gradient-to-r from-[#0EA5E9]/18 via-[var(--tm-elevated)] to-[var(--tm-surface)] border-b border-[#0EA5E9]/25">
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-[#0EA5E9]/35 shadow-md shadow-[#0EA5E9]/20">
                  <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center">
                    {getUserInitials(profile.name || displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h4 className="text-[14px] font-semibold text-slate-50 leading-snug break-words">
                    {profile.name || 'User'}
                  </h4>
                  {profile.userName ? (
                    <span className="inline-flex mt-1.5 max-w-full items-center rounded-[6px] bg-[#0EA5E9]/15 px-2 py-0.5 text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/30 break-all">
                      {profile.userName}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="px-4 py-3 space-y-2.5 min-h-0 flex-1 overflow-y-auto bg-[var(--tm-surface)]">
                <ProfileRow icon={Mail} label="Email" value={profile.email || 'No email registered'} />
                <ProfileRow icon={Phone} label="Phone" value={profile.phone || 'No phone number'} />
                <ProfileRow icon={BadgeCheck} label="Roles" value={profile.roles} accent="sky" />
                <ProfileRow
                  icon={Briefcase}
                  label="Responsibility / Job Description"
                  value={profile.responsibility}
                />
                <ProfileRow icon={Building2} label="Company" value={profile.company} />
                <ProfileRow icon={MapPin} label="Location" value={profile.location} />
                <ProfileRow icon={UserRound} label="Report To" value={profile.reportTo} />
                {profile.userTypeName ? (
                  <div className="pt-2 border-t border-[var(--tm-border)]">
                    <ProfileRow icon={ShieldCheck} label="Type" value={profile.userTypeName} accent="emerald" />
                  </div>
                ) : null}
              </div>

              {loginNo ? (
                <div className="shrink-0 border-t border-[#0EA5E9]/20 px-3 py-2.5 bg-[var(--tm-elevated)]">
                  <Link
                    to={userProfilePath(loginNo)}
                    onClick={() => setOpenUserAvatarId(null)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[7px] px-3 py-2 text-[11px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/12 ring-1 ring-[#0EA5E9]/30 hover:bg-[#0EA5E9]/20 transition-colors"
                  >
                    View full profile
                    <ExternalLink size={12} strokeWidth={2.25} />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-6 px-4 pr-10 bg-[var(--tm-surface)]">
              <p className="text-[11px] font-medium text-slate-400">No user info available</p>
            </div>
          )}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
