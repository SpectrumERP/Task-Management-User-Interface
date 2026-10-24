import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  Copy,
  Mail,
  MapPin,
  Phone,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { Button } from '@/components/ui/button';
import { SkeletonProfile } from '@/components/ui/skeleton';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { cn } from '@/lib/utils';
import {
  asUserDetails,
  getUserInitials,
  mapUserProfile,
  type MappedUserProfile,
  type UserDetails,
} from '@/lib/userProfile';

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Couldn’t copy ${label.toLowerCase()}`);
  }
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  copyLabel,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
  copyLabel?: string;
  accent?: 'sky' | 'emerald';
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className="grid grid-cols-[2.25rem_7.5rem_minmax(0,1fr)_2rem] sm:grid-cols-[2.25rem_9rem_minmax(0,1fr)_2rem] items-center gap-x-3 px-4 sm:px-5 py-3.5 border-b border-[var(--tm-border)]/70 last:border-b-0">
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-[8px] ring-1',
          !hasValue
            ? 'bg-[var(--tm-muted)] text-slate-500 ring-slate-500/20'
            : accent === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
              : accent === 'sky'
                ? 'bg-[#0EA5E9]/15 text-[#0EA5E9] ring-[#0EA5E9]/25'
                : 'bg-[var(--tm-muted)] text-slate-400 ring-slate-500/25'
        )}
      >
        <Icon size={15} strokeWidth={1.75} />
      </span>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
        {label}
      </p>

      <div className="min-w-0">
        {!hasValue ? (
          <p className="text-sm font-medium text-slate-500">—</p>
        ) : href ? (
          <a
            href={href}
            className="block text-sm font-medium text-[#0EA5E9] hover:text-[#0284C7] break-words leading-snug underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          <p
            className={cn(
              'text-sm font-medium break-words leading-snug',
              accent === 'emerald' ? 'text-emerald-400' : accent === 'sky' ? 'text-[#0EA5E9]' : 'text-slate-100'
            )}
          >
            {value}
          </p>
        )}
      </div>

      <div className="flex h-8 w-8 items-center justify-center">
        {hasValue && copyLabel ? (
          <ActionTip label={`Copy ${copyLabel}`}>
            <button
              type="button"
              onClick={() => void copyText(copyLabel, value!)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
              aria-label={`Copy ${copyLabel}`}
            >
              <Copy size={13} />
            </button>
          </ActionTip>
        ) : null}
      </div>
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="px-4 sm:px-5 py-2.5 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/50">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function UserProfilePage() {
  const { loginNo: loginNoParam } = useParams();
  const navigate = useNavigate();
  const loginNo = Number(loginNoParam);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<UserDetails | null>(null);

  const load = useCallback(async () => {
    if (!loginNoParam || Number.isNaN(loginNo) || loginNo <= 0) {
      setError('Invalid user.');
      setIsLoading(false);
      setRaw(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.get<{ success: boolean; data: UserDetails; message?: string }>(
        `/api/security/users/load-data/${loginNo}`
      );
      if (response.success && response.data) {
        setRaw(asUserDetails(response.data) || (response.data as UserDetails));
      } else {
        setRaw(null);
        setError(response.message || 'Failed to load user profile.');
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setRaw(null);
      setError('Error loading user profile.');
    } finally {
      setIsLoading(false);
    }
  }, [loginNo, loginNoParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const profile: MappedUserProfile = mapUserProfile(raw);
  const initials = getUserInitials(profile.name);
  const showUserName =
    Boolean(profile.userName) &&
    profile.userName.trim().toLowerCase() !== (profile.name || '').trim().toLowerCase();

  useEffect(() => {
    const prev = document.title;
    if (!isLoading && !error && profile.name) {
      document.title = `${profile.name} · Profile`;
    } else {
      document.title = 'User profile';
    }
    return () => {
      document.title = prev;
    };
  }, [error, isLoading, profile.name]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="page-shell gap-4 w-full min-w-0 overflow-hidden">
      <AppBreadcrumbBar
        items={[
          { label: 'Home', href: '/' },
          { label: 'User Profile', current: true },
        ]}
        bleed
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-9 px-3 rounded-[8px] text-xs font-medium text-slate-300 border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] shadow-none gap-1.5"
          >
            <ArrowLeft size={14} />
            Back
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex-1 min-h-0 overflow-hidden rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)]">
          <SkeletonProfile label="Loading profile" />
        </div>
      ) : error ? (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)]">
          <LoadErrorState title="Couldn’t load profile" description={error} onRetry={() => void load()} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex flex-col rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
          {/* Identity header — compact single row */}
          <div className="shrink-0 relative overflow-hidden rounded-t-[16px] border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/40">
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#38BDF8] to-[#0EA5E9]"
            />
            <div className="relative flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 pl-5 sm:pl-6">
              <Avatar className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 ring-2 ring-[#0EA5E9]/30">
                <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h1 className="text-base sm:text-lg font-semibold text-slate-50 tracking-tight truncate leading-none">
                  {profile.name || 'User'}
                </h1>
                {showUserName ? (
                  <span className="inline-flex items-center rounded-md bg-[#0EA5E9]/12 px-2 py-0.5 text-[11px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/25 max-w-[10rem] truncate">
                    @{profile.userName}
                  </span>
                ) : null}
                {profile.userTypeName ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                    <BadgeCheck size={12} strokeWidth={2.25} />
                    {profile.userTypeName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Profile details — only this region scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-b-[16px]">
            <div className="grid lg:grid-cols-2 lg:divide-x divide-[var(--tm-border)]">
              <DetailGroup title="Contact">
                <DetailRow
                  icon={Mail}
                  label="Email"
                  value={profile.email}
                  href={profile.email ? `mailto:${profile.email}` : undefined}
                  copyLabel="Email"
                />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={profile.phone}
                  href={profile.phone ? `tel:${profile.phone.replace(/\s+/g, '')}` : undefined}
                  copyLabel="Phone"
                />
              </DetailGroup>

              <DetailGroup title="Organization">
                <DetailRow icon={Building2} label="Company" value={profile.company} />
                <DetailRow icon={MapPin} label="Location" value={profile.location} />
                <DetailRow icon={UserRound} label="Report To" value={profile.reportTo} />
              </DetailGroup>
            </div>

            <div className="border-t border-[var(--tm-border)]">
              <DetailGroup title="Work">
                <DetailRow icon={BadgeCheck} label="Roles" value={profile.roles} accent="sky" />
                <DetailRow
                  icon={Briefcase}
                  label="Responsibility"
                  value={profile.responsibility}
                />
              </DetailGroup>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
