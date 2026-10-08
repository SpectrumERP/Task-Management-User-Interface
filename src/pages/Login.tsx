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
import { FieldErrorTip } from '@/components/ui/form-field';
import { markOnboardingPending } from '@/components/layout/OnboardingSpotlightTour';
import { InlineLoader } from '@/components/ui/BrandLoader';

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
    <div className="login-page min-h-screen w-full relative overflow-hidden bg-[var(--tm-page)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.14),_transparent_55%)] pointer-events-none dark:opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),_transparent_55%)] pointer-events-none dark:opacity-40 opacity-70" />
      <svg
        className="absolute inset-x-0 bottom-0 h-[48vh] w-full opacity-[0.22] dark:opacity-[0.12] pointer-events-none"
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
          className="w-full max-w-[42rem] max-h-[calc(100vh-1.5rem)] grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] overflow-hidden border border-sky-400/25 dark:border-white/10 bg-white dark:bg-[#0C4A6E] shadow-[0_28px_60px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)] rounded-tl-none rounded-br-none rounded-tr-[1.75rem] rounded-bl-[1.75rem] [transform-style:preserve-3d]"
        >
          {/* Left brand — cyan panel, theme-independent */}
          <div className="relative hidden lg:flex flex-col overflow-hidden bg-[#0EA5E9] text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0369A1]" />
            <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:16px_16px]" />

            <div
              className="absolute inset-x-0 bottom-0 h-[42%] bg-[#003049]/30"
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

            {/* Light: white strip. Dark: navy/cyan strip (not white) */}
            <div
              className="absolute top-0 inset-x-0 z-[5] h-[80px] bg-[#003d5c]/25 dark:hidden"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 48%, 78% 100%, 0 68%)' }}
            />
            <div
              className="absolute top-0 inset-x-0 z-[6] h-[76px] bg-white shadow-[0_10px_28px_rgba(0,40,70,0.12)] dark:hidden"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 52%, 82% 100%, 0 72%)' }}
            />
            <div className="absolute top-0 right-0 z-[6] h-[48px] w-8 bg-white dark:hidden" aria-hidden="true" />
            <div
              className="absolute top-0 inset-x-0 z-[5] hidden h-[80px] dark:block bg-[#003d5c]/25"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 48%, 78% 100%, 0 68%)' }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 inset-x-0 z-[6] hidden h-[76px] dark:block bg-[#0C4A6E] shadow-[0_10px_28px_rgba(0,20,40,0.28)]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 52%, 82% 100%, 0 72%)' }}
              aria-hidden="true"
            />
            <div className="absolute top-0 right-0 z-[6] hidden h-[48px] w-8 dark:block bg-[#0C4A6E]" aria-hidden="true" />

            <motion.img
              src={brand.maskLogoSrc}
              alt=""
              aria-hidden="true"
              animate={{ opacity: [0.05, 0.09, 0.05], y: [0, -4, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className={`pointer-events-none absolute -right-6 bottom-4 h-[72px] w-[120px] object-contain select-none ${brand.invertMaskLogo ? 'brightness-0 invert' : 'opacity-40'
                }`}
            />

            <div className="relative z-10 flex h-full flex-col px-5 pb-5 pt-0">
              <div className="relative z-10 flex h-[60px] min-w-0 items-center justify-between gap-2">
                <div className="flex h-11 w-[14rem] shrink min-w-0 items-center overflow-hidden">
                  <BrandLogo maxHeight={44} maxWidth={224} imgClassName="dark:brightness-0 dark:invert" />
                </div>
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0EA5E9]/25 bg-[#E0F2FE] px-2 py-0.5 max-w-[8.75rem] dark:border-white/25 dark:bg-white/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 dark:bg-emerald-400" />
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-[#0284C7] truncate dark:text-white">
                    {brand.productName}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-1.5 max-w-[16rem]">
                <h1 className="text-[1.25rem] font-semibold tracking-tight leading-[1.2] text-white">
                  Plan. Track.
                  <span className="block text-white/90">Deliver together.</span>
                </h1>
                <p className="text-white/80 text-[11px] leading-relaxed pt-0.5">
                  {brand.description}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {[
                  { key: 'boards' as const, title: 'Tasks', desc: 'Manage and track tasks' },
                  { key: 'teams' as const, title: 'Deals', desc: 'Manage deals' },
                  { key: 'planner' as const, title: 'Meetings', desc: 'Manage minutes of the meetings' },
                ].map(({ key, title, desc }, index) => {
                  const Icon = FEATURE_ICONS[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.08, duration: 0.35 }}
                      className="flex items-center gap-2 border border-white/20 bg-white/10 px-2.5 py-1.5 shadow-[4px_4px_0_rgba(0,40,70,0.18)] backdrop-blur-[1px]"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 97% 100%, 0 100%)',
                        transform: `translateX(${index * 4}px)`,
                      }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15">
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white leading-tight">{title}</p>
                        <p className="text-[9px] text-white/70 leading-tight mt-0.5">{desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-white/20">
                <p className="text-[9px] text-white/70 font-medium">{brand.secureNote}</p>
                <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-[#FBBF24]">
                  {brand.liveBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Right form — dark bg matches left header bar (#0C4A6E) */}
          <div className="relative bg-white dark:bg-[#0C4A6E] px-6 py-6 sm:px-7 sm:py-8 flex flex-col justify-center overflow-visible">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 bg-[#0EA5E9]/5 dark:bg-[#0EA5E9]/12"
              style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 70%, 0 100%)' }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 h-16 opacity-[0.07] dark:hidden"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #0EA5E9 0, #0EA5E9 1px, transparent 1px, transparent 28px)',
                clipPath: 'polygon(0 55%, 100% 0, 100% 100%, 0 100%)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 hidden h-16 dark:block opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #7DD3FC 0, #7DD3FC 1px, transparent 1px, transparent 28px)',
                clipPath: 'polygon(0 55%, 100% 0, 100% 100%, 0 100%)',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 mb-6 flex flex-col items-center lg:items-start gap-2.5">
              <div className="flex w-full items-center justify-between gap-3 lg:hidden">
                <BrandLogo
                  maxHeight={44}
                  maxWidth={240}
                  imgClassName="dark:brightness-0 dark:invert"
                />
                <ThemeToggle variant="chip" size="md" />
              </div>
              <span className="inline-flex items-center rounded-full bg-[#0EA5E9]/10 dark:bg-sky-400/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0284C7] dark:text-sky-300 lg:hidden">
                {brand.productName}
              </span>
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-center lg:text-left space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0284C7] dark:text-sky-300">
                    Sign in
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-50">Welcome Back</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Enter your credentials to continue
                  </p>
                </div>
                <ThemeToggle variant="chip" size="md" className="mt-0.5 hidden shrink-0 lg:inline-flex" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 space-y-5 max-w-md mx-auto lg:mx-0 w-full overflow-visible">
              <div className="space-y-1.5">
                <Label htmlFor="loginId" className="inline-flex items-start gap-0.5 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                  User name
                  <span className="text-red-500 dark:text-red-400 leading-none" aria-hidden="true">*</span>
                </Label>
                <div className="relative min-w-0">
                  <User className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="loginId"
                    placeholder="Enter user name"
                    autoFocus
                    autoComplete="username"
                    aria-invalid={!!errors.loginId}
                    className={`login-field pl-10 h-11 !rounded-[10px] text-slate-800 dark:!text-slate-50 shadow-none focus-visible:!ring-2 focus-visible:!ring-[#0EA5E9]/35 focus-visible:!ring-offset-0 dark:focus-visible:!ring-offset-[var(--tm-surface)] focus:!ring-2 focus:!ring-[#0EA5E9]/35 outline-none ${errors.loginId
                      ? '!border-2 !border-red-500 focus:!border-red-500'
                      : '!border-[1.5px] !border-slate-400 dark:!border-[#5B9BB8] focus:!border-[#0EA5E9] hover:!border-slate-500 dark:hover:!border-sky-400/70'
                      }`}
                    {...register('loginId', {
                      onChange: () => setServerError(''),
                    })}
                    maxLength={50}
                  />
                  {errors.loginId?.message ? (
                    <FieldErrorTip
                      message={errors.loginId.message}
                      className="max-w-[min(100%,220px)]"
                    />
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="inline-flex items-start gap-0.5 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                  Password
                  <span className="text-red-500 dark:text-red-400 leading-none" aria-hidden="true">*</span>
                </Label>
                <div className="relative min-w-0">
                  <Lock className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className={`login-field pl-10 pr-10 h-11 !rounded-[10px] text-slate-800 dark:!text-slate-50 shadow-none focus-visible:!ring-2 focus-visible:!ring-[#0EA5E9]/35 focus-visible:!ring-offset-0 dark:focus-visible:!ring-offset-[var(--tm-surface)] focus:!ring-2 focus:!ring-[#0EA5E9]/35 outline-none ${errors.password
                      ? '!border-2 !border-red-500 focus:!border-red-500'
                      : '!border-[1.5px] !border-slate-400 dark:!border-[#5B9BB8] focus:!border-[#0EA5E9] hover:!border-slate-500 dark:hover:!border-sky-400/70'
                      }`}
                    {...register('password', {
                      onChange: () => setServerError(''),
                    })}
                    maxLength={50}
                  />
                  {errors.password?.message ? (
                    <FieldErrorTip
                      message={errors.password.message}
                      className="max-w-[min(100%,220px)]"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {serverError && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-600 dark:text-red-300 font-medium bg-red-50 dark:bg-red-500/15 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-400/40 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0" />
                  {serverError}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-11 mt-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] dark:shadow-[0_8px_22px_rgba(14,165,233,0.28)] transition-all hover:translate-y-[-1px] active:translate-y-0 rounded-xl font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <InlineLoader size={16} className="text-white" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            </form>

            <p className="relative z-10 mt-5 text-center lg:text-left text-xs text-slate-400 dark:text-slate-500 font-medium">
              © {new Date().getFullYear()} {brand.brandName} · {brand.copyrightSuffix}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
