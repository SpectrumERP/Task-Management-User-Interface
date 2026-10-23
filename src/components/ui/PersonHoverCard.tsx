import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  Users,
  X,
} from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { EmployeeAvatar, EmployeeStatusPill } from '@/components/employee/employeeShared';
import { cn } from '@/lib/utils';
import { getOpenUserAvatarId, setOpenUserAvatarId, subscribeOpenUserAvatar } from '@/lib/openUserAvatar';
import { getUserInitials, mapUserProfile, userProfilePath } from '@/lib/userProfile';
import { canOpenEmployeeDirectory, employeeProfilePath } from '@/lib/employeeDirectory';
import { usePersonDetails, type PersonRef } from '@/lib/personDetails';
import { useAuthStore } from '@/store/useAuthStore';

/** Hover this long before the card opens, so moving the mouse across a list doesn't flash cards. */
const OPEN_DELAY_MS = 400;
/** Grace period to move from the name onto the card. */
const CLOSE_DELAY_MS = 200;

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

function CardHeader({ avatar, name, badge, extra }: { avatar: ReactNode; name: string; badge?: string; extra?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-start gap-3 px-4 py-3.5 pr-11 bg-gradient-to-r from-[#0EA5E9]/18 via-[var(--tm-elevated)] to-[var(--tm-surface)] border-b border-[#0EA5E9]/25">
      {avatar}
      <div className="min-w-0 flex-1 pt-0.5">
        <h4 className="text-[14px] font-semibold text-slate-50 leading-snug break-words">{name}</h4>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {badge ? (
            <span className="inline-flex max-w-full items-center rounded-[6px] bg-[#0EA5E9]/15 px-2 py-0.5 text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/30 break-all">
              {badge}
            </span>
          ) : null}
          {extra}
        </div>
      </div>
    </div>
  );
}

function ProfileLink({ to, onNavigate }: { to: string; onNavigate: () => void }) {
  return (
    <div className="shrink-0 border-t border-[#0EA5E9]/20 px-3 py-2.5 bg-[var(--tm-elevated)]">
      <Link
        to={to}
        onClick={onNavigate}
        className="flex w-full items-center justify-center gap-1.5 rounded-[7px] px-3 py-2 text-[11px] font-semibold text-[#0EA5E9] bg-[#0EA5E9]/12 ring-1 ring-[#0EA5E9]/30 hover:bg-[#0EA5E9]/20 transition-colors"
      >
        View full profile
        <ExternalLink size={12} strokeWidth={2.25} />
      </Link>
    </div>
  );
}

function PersonCardBody({ person, name, onNavigate }: { person: PersonRef; name?: string; onNavigate: () => void }) {
  const state = usePersonDetails(person, true);
  const accessibleForms = useAuthStore((s) => s.accessibleForms);

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 pr-8">
        <BrandLoader size="sm" message="Loading profile" />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <LoadErrorState compact className="pr-10" title="Couldn’t load profile" description="Hover again to retry." />
    );
  }
  if (!state.details) {
    return (
      <div className="text-center py-6 px-4 pr-10 bg-[var(--tm-surface)]">
        <p className="text-[11px] font-medium text-slate-400">No details available{name ? ` for ${name}` : ''}</p>
      </div>
    );
  }

  if (state.details.kind === 'user' && person.kind === 'user') {
    const profile = mapUserProfile(state.details.user, name);
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader
          avatar={
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-[#0EA5E9]/35 shadow-md shadow-[#0EA5E9]/20">
              <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center">
                {getUserInitials(profile.name || name)}
              </AvatarFallback>
            </Avatar>
          }
          name={profile.name || name || 'User'}
          badge={profile.userName}
        />
        <div className="px-4 py-3 space-y-2.5 min-h-0 flex-1 overflow-y-auto bg-[var(--tm-surface)]">
          <ProfileRow icon={Mail} label="Email" value={profile.email || 'No email registered'} />
          <ProfileRow icon={Phone} label="Phone" value={profile.phone || 'No phone number'} />
          <ProfileRow icon={BadgeCheck} label="Roles" value={profile.roles} accent="sky" />
          <ProfileRow icon={Briefcase} label="Responsibility / Job Description" value={profile.responsibility} />
          <ProfileRow icon={Building2} label="Company" value={profile.company} />
          <ProfileRow icon={MapPin} label="Location" value={profile.location} />
          <ProfileRow icon={UserRound} label="Report To" value={profile.reportTo} />
          {profile.userTypeName ? (
            <div className="pt-2 border-t border-[var(--tm-border)]">
              <ProfileRow icon={ShieldCheck} label="Type" value={profile.userTypeName} accent="emerald" />
            </div>
          ) : null}
        </div>
        <ProfileLink to={userProfilePath(person.loginNo)} onNavigate={onNavigate} />
      </div>
    );
  }

  if (state.details.kind === 'employee' && person.kind === 'employee') {
    const e = state.details.employee;
    const phone = [e.phone, e.extension ? `Ext ${e.extension}` : ''].filter(Boolean).join(' · ');
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader
          avatar={<EmployeeAvatar employee={e} className="h-12 w-12 text-sm ring-2 ring-[#0EA5E9]/35" />}
          name={e.empName || name || 'Employee'}
          badge={e.empCode}
          extra={<EmployeeStatusPill status={e.status} />}
        />
        <div className="px-4 py-3 space-y-2.5 min-h-0 flex-1 overflow-y-auto bg-[var(--tm-surface)]">
          <ProfileRow icon={Mail} label="Email" value={e.email || 'No email registered'} />
          <ProfileRow icon={Phone} label="Phone" value={phone || 'No phone number'} />
          <ProfileRow icon={Users} label="Department" value={e.department} accent="sky" />
          <ProfileRow icon={Briefcase} label="Job Description" value={e.jobDescription} />
          <ProfileRow icon={Building2} label="Company" value={e.companyName} />
          <ProfileRow icon={MapPin} label="Work Location" value={e.workLocation} />
        </div>
        {canOpenEmployeeDirectory(accessibleForms) ? (
          <ProfileLink to={employeeProfilePath(person.empNo)} onNavigate={onNavigate} />
        ) : null}
      </div>
    );
  }
  return null;
}

interface PersonHoverCardProps {
  /** The person to show; null renders the children as they are (no card). */
  person: PersonRef | null;
  /** Shown while loading / when the API has no name. */
  name?: string;
  children: ReactNode;
  /** Also open on a mouse click (avatars). Touch always opens on tap, since there is no hover. */
  openOnClick?: boolean;
  /** Classes for the wrapper around the children. */
  className?: string;
}

/**
 * Profile card for a user or an employee: opens on hover (after a short delay), on tap for touch,
 * and with Enter / Space from the keyboard. Details load from the API the first time it opens and are
 * cached for the session. Only one card is open at a time.
 */
export function PersonHoverCard({ person, name, children, openOnClick = false, className }: PersonHoverCardProps) {
  const instanceId = useId();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const openId = useSyncExternalStore(subscribeOpenUserAvatar, getOpenUserAvatarId, () => null);
  const isOpen = !!person && openId === instanceId;
  const [cardSide, setCardSide] = useState<'top' | 'bottom' | 'right'>('bottom');
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef<string>('mouse');

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };
  useEffect(() => clearTimers, []);

  const open = () => {
    clearTimers();
    setCardSide(pickProfileCardSide(anchorRef.current));
    setOpenUserAvatarId(instanceId);
  };
  const close = () => {
    clearTimers();
    // Only the active card may clear — avoids a race when moving between people.
    if (getOpenUserAvatarId() === instanceId) setOpenUserAvatarId(null);
  };
  const scheduleOpen = () => {
    window.clearTimeout(closeTimer.current);
    if (isOpen) return;
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(open, OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(close, CLOSE_DELAY_MS);
  };

  if (!person) return <>{children}</>;

  return (
    <Popover open={isOpen} onOpenChange={(next) => (next ? open() : close())} modal={false}>
      <PopoverAnchor asChild>
        <span
          ref={anchorRef}
          className={cn('inline-flex min-w-0 max-w-full cursor-pointer', className)}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
          }}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') scheduleOpen();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') scheduleClose();
          }}
          onClick={(e) => {
            if (!openOnClick && lastPointer.current !== 'touch') return;
            // The name often sits in a clickable row or card: open the profile instead.
            e.stopPropagation();
            e.preventDefault();
            if (isOpen) close();
            else open();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (isOpen) close();
              else open();
            } else if (e.key === 'Escape' && isOpen) {
              close();
            }
          }}
        >
          {children}
        </span>
      </PopoverAnchor>

      {isOpen ? (
        <PopoverContent
          align="start"
          side={cardSide}
          sideOffset={8}
          collisionPadding={{ top: 80, right: 16, bottom: 24, left: 16 }}
          avoidCollisions
          sticky="partial"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          // A press on the name itself is handled by its own click (toggle), not as an outside press.
          onPointerDownOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') scheduleClose();
          }}
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
          // Content is portalled, but React still bubbles its events to the row the name sits in.
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close profile"
            className="absolute right-2.5 top-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-[var(--tm-muted)] transition-colors"
          >
            <X size={14} strokeWidth={2.25} />
          </button>
          <PersonCardBody person={person} name={name} onNavigate={close} />
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

/**
 * A person's name as text that opens their profile card on hover. Falls back to plain text when there
 * is no id (e.g. "System" or a name typed by hand).
 */
export function PersonName({
  person,
  name,
  className,
  wrapperClassName,
}: {
  person: PersonRef | null;
  name: string;
  className?: string;
  wrapperClassName?: string;
}) {
  if (!person || !name) return <span className={cn('min-w-0 truncate', className)}>{name}</span>;
  return (
    <PersonHoverCard person={person} name={name} className={wrapperClassName}>
      <span
        role="button"
        tabIndex={0}
        className={cn(
          'min-w-0 truncate cursor-pointer rounded-[4px] decoration-dotted underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/30',
          className
        )}
      >
        {name}
      </span>
    </PersonHoverCard>
  );
}
