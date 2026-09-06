import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, User, ArrowRight, Eye, EyeOff, LayoutDashboard, CalendarDays, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/authService';
import { getBrand } from '@/config/brandConfig';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { markOnboardingPending } from '@/components/layout/OnboardingSpotlightTour';

const FEATURE_ICONS = {
  boards: LayoutDashboard,
  planner: CalendarDays,
  teams: Users,
} as const;

const loginSchema = z.object({
  loginId: z.string().min(1, 'User name is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const brand = useMemo(() => getBrand(), []);

  const { login, isAuthenticated, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    shouldFocusError: false,
    mode: 'onSubmit',
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      if (session && authService.isTokenExpired(session.token)) {
        setServerError('Session timed out. Please sign in again.');
        await logout();
        navigate('/login');
      }
    };

    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, [logout, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError('');

    try {
      const success = await login(data.loginId, data.password);
      if (success) {
        markOnboardingPending();
        navigate(from, { replace: true });
      } else {
        setServerError('Invalid user name or password');
      }
    } catch (error: any) {
      setServerError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[var(--tm-page)]">
      <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <ThemeToggle variant="chip" size="md" />
      </div>
      {/* Soft atmosphere — theme aware */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.14),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),_transparent_55%)] pointer-events-none dark:opacity-100 opacity-70" />
      <svg
        className="absolute inset-x-0 bottom-0 h-[48vh] w-full opacity-[0.22] pointer-events-none"
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M600 0 L0 500 M600 0 L1200 500" stroke="#0EA5E9" strokeWidth="1.2" fill="none" />
        <path d="M600 0 L120 500 M600 0 L1080 500" stroke="#0EA5E9" strokeWidth="0.9" fill="none" />
        <path d="M600 0 L240 500 M600 0 L960 500" stroke="#0EA5E9" strokeWidth="0.8" fill="none" />
        <path d="M600 0 L360 500 M600 0 L840 500" stroke="#0EA5E9" strokeWidth="0.7" fill="none" />
        <path d="M0 120 H1200 M0 200 H1200 M0 290 H1200 M0 390 H1200" stroke="#0EA5E9" strokeWidth="0.6" fill="none" />
      </svg>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4 lg:p-5 [perspective:1400px]">
        <motion.div
          initial={{ opacity: 0, y: 28, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[42rem] max-h-[calc(100vh-1.5rem)] grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] overflow-visible border border-sky-400/20 bg-[var(--tm-surface)] shadow-[0_28px_60px_rgba(0,0,0,0.55)] rounded-tl-none rounded-br-none rounded-tr-[1.75rem] rounded-bl-[1.75rem] [transform-style:preserve-3d]"
        >
          {/* Left brand — perspective planes */}
          <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#0EA5E9] text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0BA5D4] via-[#0EA5E9] to-[#0C4A6E]" />
            <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:16px_16px]" />

            {/* Angled floor plane on left panel */}
            <div
              className="absolute inset-x-0 bottom-0 h-[42%] bg-[#003049]/35"
              style={{ clipPath: 'polygon(0 38%, 100% 0, 100% 100%, 0 100%)' }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[28%] opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.12) 18px, rgba(255,255,255,0.12) 19px)',
                clipPath: 'polygon(0 45%, 100% 0, 100% 100%, 0 100%)',
              }}
              aria-hidden="true"
            />

            {/* Perspective white header — first angled design */}
            <div
              className="absolute top-0 inset-x-0 z-[5] h-[80px] bg-[#003d5c]/35"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 48%, 78% 100%, 0 68%)' }}
            />
            <div
              className="absolute top-0 inset-x-0 z-[6] h-[76px] bg-[var(--tm-surface)] shadow-[0_10px_28px_rgba(0,40,70,0.12)]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 52%, 82% 100%, 0 72%)' }}
            />
            <div className="absolute top-0 right-0 z-[6] h-[48px] w-8 bg-[var(--tm-surface)]" aria-hidden="true" />
            <div
              className="absolute top-[44px] inset-x-0 z-[5] h-[18px] bg-gradient-to-r from-transparent via-[var(--tm-elevated)]/25 to-transparent"
              style={{ clipPath: 'polygon(0 40%, 78% 0, 100% 20%, 100% 100%, 0 100%)' }}
              aria-hidden="true"
            />

            <motion.img
              src={brand.maskLogoSrc}
              alt=""
              aria-hidden="true"
              animate={{ opacity: [0.04, 0.07, 0.04], y: [0, -4, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className={`pointer-events-none absolute -right-6 bottom-4 h-[72px] w-[120px] object-contain select-none ${
                brand.invertMaskLogo ? 'brightness-0 invert' : 'opacity-40'
              }`}
            />

            <div className="relative z-10 flex h-full flex-col px-5 pb-5 pt-0">
              <div className="relative z-10 flex h-[60px] min-w-0 items-center justify-between gap-2">
                {/* Fixed logo slot — any client logo fits without breaking layout */}
                <div className="flex h-11 w-[14rem] shrink min-w-0 items-center overflow-hidden">
                  {/* Header strip is --tm-surface: light = white (keep dark logo), dark = invert to white */}
                  <BrandLogo
                    maxHeight={44}
                    maxWidth={224}
                    imgClassName={
                      brand.invertMaskLogo ? 'dark:brightness-0 dark:invert' : undefined
                    }
                  />
                </div>
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0EA5E9]/20 bg-[#0EA5E9]/8 px-2 py-0.5 max-w-[8.75rem]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-[#0EA5E9] truncate">
                    {brand.productName}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-1.5 max-w-[16rem]">
                <h1 className="text-[1.25rem] font-semibold tracking-tight leading-[1.2] text-white">
                  Plan. Track.
                  <span className="block text-white/85">Deliver together.</span>
                </h1>
                <p className="text-white/75 text-[11px] leading-relaxed pt-0.5">
                  {brand.description}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {[
                  { key: 'boards' as const, title: 'Boards', desc: 'See work across stages' },
                  { key: 'planner' as const, title: 'Planner', desc: 'Deadlines in one place' },
                  { key: 'teams' as const, title: 'Teams', desc: 'Shared team visibility' },
                ].map(({ key, title, desc }, index) => {
                  const Icon = FEATURE_ICONS[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.08, duration: 0.35 }}
                      className="flex items-center gap-2 border border-white/15 bg-[var(--tm-surface)]/10 px-2.5 py-1.5 shadow-[4px_4px_0_rgba(0,40,70,0.18)]"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0 100%)',
                        transform: `translateX(${index * 4}px)`,
                      }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--tm-surface)]/15">
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white leading-tight">{title}</p>
                        <p className="text-[9px] text-white/65 leading-tight mt-0.5">{desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-white/15">
                <p className="text-[9px] text-white/60 font-medium">{brand.secureNote}</p>
                <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                  {brand.liveBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Right form — perspective panel */}
          <div className="relative bg-[var(--tm-surface)] px-6 py-6 sm:px-7 sm:py-7 flex flex-col justify-center overflow-visible">
            {/* Perspective accent planes on form side */}
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 bg-[#0EA5E9]/5"
              style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 70%, 0 100%)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 h-16 opacity-[0.07]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #0EA5E9 0, #0EA5E9 1px, transparent 1px, transparent 28px)',
                clipPath: 'polygon(0 55%, 100% 0, 100% 100%, 0 100%)',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 mb-5 flex flex-col items-center lg:items-start gap-2">
              <BrandLogo
                maxHeight={44}
                maxWidth={240}
                className="lg:hidden"
                imgClassName="dark:brightness-0 dark:invert"
              />
              <span className="inline-flex items-center rounded-full bg-[#0EA5E9]/8 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0EA5E9] lg:hidden">
                {brand.productName}
              </span>
              <div className="text-center lg:text-left space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0EA5E9]/70">
                  Sign in
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100">Welcome Back</h2>
                <p className="text-slate-500 text-sm font-medium">Enter your credentials to continue</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 space-y-5 max-w-md mx-auto lg:mx-0 w-full overflow-visible">
              <div className="space-y-1.5">
                <Label htmlFor="loginId" className="inline-flex items-start gap-0.5 text-slate-200 font-semibold text-sm">
                  User name
                  <span className="text-red-400 leading-none" aria-hidden="true">*</span>
                </Label>
                <div className="relative min-w-0">
                  <User className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="loginId"
                    placeholder="Enter user name"
                    autoFocus
                    autoComplete="username"
                    aria-invalid={!!errors.loginId}
                    className={`pl-10 bg-[var(--tm-page)] rounded-[8px] h-11 shadow-[3px_3px_0_rgba(14,165,233,0.12)] focus-visible:!ring-0 focus-visible:!ring-offset-0 focus:!ring-0 outline-none ${
                      errors.loginId
                        ? '!border !border-red-500 focus:!border-red-500'
                        : 'border border-[var(--tm-border)] focus:!border-[#0EA5E9]'
                    }`}
                    {...register('loginId', {
                      onChange: () => setServerError(''),
                    })}
                    maxLength={50}
                  />
                  {errors.loginId?.message ? (
                    <span
                      role="alert"
                      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,220px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
                    >
                      {errors.loginId.message}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="inline-flex items-start gap-0.5 text-slate-200 font-semibold text-sm">
                  Password
                  <span className="text-red-400 leading-none" aria-hidden="true">*</span>
                </Label>
                <div className="relative min-w-0">
                  <Lock className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className={`pl-10 pr-10 bg-[var(--tm-page)] rounded-[8px] h-11 shadow-[3px_3px_0_rgba(14,165,233,0.12)] focus-visible:!ring-0 focus-visible:!ring-offset-0 focus:!ring-0 outline-none ${
                      errors.password
                        ? '!border !border-red-500 focus:!border-red-500'
                        : 'border border-[var(--tm-border)] focus:!border-[#0EA5E9]'
                    }`}
                    {...register('password', {
                      onChange: () => setServerError(''),
                    })}
                    maxLength={50}
                  />
                  {errors.password?.message ? (
                    <span
                      role="alert"
                      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,220px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
                    >
                      {errors.password.message}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {serverError && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-400 font-medium bg-red-500/10 px-3 py-2.5 rounded-xl border border-red-500/30 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {serverError}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-11 mt-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] transition-all hover:translate-y-[-1px] active:translate-y-0 rounded-xl font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            </form>

            <p className="relative z-10 mt-5 text-center lg:text-left text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} {brand.brandName} · {brand.copyrightSuffix}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
