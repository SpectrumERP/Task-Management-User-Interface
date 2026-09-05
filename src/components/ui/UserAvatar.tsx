import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { apiService } from '@/services/apiService';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  loginNo?: number | null;
  displayName?: string;
  initials?: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'default';
}

interface UserDetails {
  loginNo: number;
  userName: string;
  displayName: string;
  email: string;
  phoneNo: string;
  userType: number;
  userTypeName: string;
}

export function UserAvatar({
  loginNo,
  displayName,
  initials,
  className,
  fallbackClassName,
  size = 'default'
}: UserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (name?: string) => {
    if (initials) return initials;
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && loginNo && !userDetails) {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiService.get<{ success: boolean; data: UserDetails; message?: string }>(
          `/api/security/users/load-data/${loginNo}`
        );
        if (response.success && response.data) {
          setUserDetails(response.data);
        } else {
          setError(response.message || 'Failed to load user details.');
        }
      } catch (err) {
        console.error('Failed to load user details:', err);
        setError('Error loading user details.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const finalInitials = getInitials(displayName);

  const sizeClasses = {
    sm: 'h-6 w-6 text-[8px]',
    md: 'h-7 w-7 text-[10px]',
    default: 'h-8 w-8 text-xs',
    lg: 'h-9 w-9 text-xs'
  }[size];

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105 select-none focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 shrink-0",
            sizeClasses,
            className
          )}
        >
          <Avatar className="h-full w-full pointer-events-none">
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-white font-semibold uppercase tracking-wide h-full w-full flex items-center justify-center shadow-sm shadow-[#0EA5E9]/10",
                fallbackClassName
              )}
            >
              {finalInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="z-[9999] w-[320px] sm:w-[360px] rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] p-0 text-slate-100 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 text-[#0EA5E9] animate-spin" />
            <span className="text-[11px] font-medium text-slate-400">Loading profile…</span>
          </div>
        ) : error ? (
          <div className="text-center py-6 px-4 space-y-1">
            <p className="text-xs font-semibold text-red-400">Couldn’t load profile</p>
            <p className="text-[11px] font-medium text-slate-500 break-words">{error}</p>
          </div>
        ) : userDetails ? (
          <div>
            <div className="flex items-start gap-3 px-4 py-3.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)]">
              <Avatar className="h-12 w-12 shrink-0 ring-2 ring-[#0EA5E9]/12 shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-[#0EA5E9] to-[#00b4d8] text-white font-semibold text-sm uppercase tracking-wide flex items-center justify-center">
                  {getInitials(userDetails.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pt-0.5">
                <h4 className="text-[14px] font-semibold text-slate-50 leading-snug break-words">
                  {userDetails.displayName}
                </h4>
                {userDetails.userName ? (
                  <span className="inline-flex mt-1.5 max-w-full items-center rounded-[6px] bg-[var(--tm-tint)] px-2 py-0.5 text-[11px] font-medium text-[#0EA5E9] break-all">
                    {userDetails.userName}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--tm-muted)] text-slate-400 ring-1 ring-slate-100">
                  <Mail size={13} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">Email</p>
                  <p className="text-[12px] font-medium text-slate-100 break-all select-all leading-snug">
                    {userDetails.email || 'No email registered'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--tm-muted)] text-slate-400 ring-1 ring-slate-100">
                  <Phone size={13} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">Phone</p>
                  <p className="text-[12px] font-medium text-slate-100 break-words leading-snug">
                    {userDetails.phoneNo || 'No phone number'}
                  </p>
                </div>
              </div>

              {userDetails.userTypeName ? (
                <div className="flex items-start gap-2.5 pt-2 border-t border-[var(--tm-border)]">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                    <ShieldCheck size={13} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400 leading-none mb-1">Type</p>
                    <p className="text-[12px] font-semibold text-emerald-400 break-words leading-snug">
                      {userDetails.userTypeName}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4">
            <p className="text-[11px] font-medium text-slate-400">No user info available</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
