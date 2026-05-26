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
            "rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105 select-none focus:outline-none focus:ring-2 focus:ring-[#006699]/30 shrink-0",
            sizeClasses,
            className
          )}
        >
          <Avatar className="h-full w-full pointer-events-none">
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br from-[#006699] to-[#00b4d8] text-white font-black uppercase tracking-wider h-full w-full flex items-center justify-center shadow-sm shadow-[#006699]/10",
                fallbackClassName
              )}
            >
              {finalInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={8}
        className="z-[9999] w-72 rounded-2xl border border-slate-150 bg-white/95 backdrop-blur-md p-4 text-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 className="h-6 w-6 text-[#006699] animate-spin" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Profile...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4 space-y-1">
            <p className="text-xs font-black text-red-500 uppercase tracking-wide">Error</p>
            <p className="text-[10px] font-semibold text-slate-500">{error}</p>
          </div>
        ) : userDetails ? (
          <div className="space-y-4">
            {/* Header / Avatar Block */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <Avatar className="h-11 w-11 border-2 border-[#006699]/10">
                <AvatarFallback className="bg-gradient-to-br from-[#006699] to-[#00b4d8] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center">
                  {getInitials(userDetails.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 tracking-tight leading-none mb-1.5">
                  {userDetails.displayName}
                </h4>
                <span className="text-[9px] font-extrabold text-[#006699] bg-[#e1ecf7] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {userDetails.userName}
                </span>
              </div>
            </div>

            {/* Content list */}
            <div className="space-y-2.5 text-[11px] font-bold text-slate-600">
              {/* Email */}
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="truncate select-all text-slate-800">{userDetails.email || 'No email registered'}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-800">{userDetails.phoneNo || 'No phone number'}</span>
              </div>

              {/* User Type */}
              {userDetails.userTypeName && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100/50">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{userDetails.userTypeName}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">No user info available</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
