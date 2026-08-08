import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/authService';
import LogoImage from '@/assets/SteelMountLogo01.png';

const loginSchema = z.object({
  loginId: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
  });

  // Redirect if already authenticated
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Session monitor interval
  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      if (session && authService.isTokenExpired(session.token)) {
        alert('Session timeout. Please login again.');
        await logout();
        navigate('/login');
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [logout, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError('');

    try {
      const success = await login(data.loginId, data.password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setServerError('Invalid username or password');
      }
    } catch (error: any) {
      setServerError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />

      {/* Bottom Illustration Overlay */}
      <div className="absolute bottom-0 left-0 w-full h-[60vh] pointer-events-none z-0 overflow-hidden">
        <motion.img
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 0.15, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          src="/login-illustration.png"
          alt="Illustration"
          className="w-full h-full object-cover object-center mix-blend-multiply opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#f8fafc]/50 to-[#f8fafc]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-slate-200/60 shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden rounded-[24px]">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-center mb-2 py-2">
              <img src={LogoImage} alt="SteelMont Logo" className="h-12 w-auto object-contain" />
            </div>
            <div className="text-center space-y-0">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome Back</CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Enter your credentials
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-0">
                <Label htmlFor="loginId" className="text-slate-700 font-bold">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="loginId"
                    placeholder="Enter username"
                    className={`pl-10 bg-white border-slate-300 focus:border-[#006699] focus:ring-[#006699]/10 transition-all rounded-xl h-11 ${errors.loginId ? 'border-red-500' : ''}`}
                    {...register('loginId')}
                    maxLength={50}
                  />
                </div>
                {errors.loginId && (
                  <p className="text-[10px] text-red-500 font-bold ml-1">{errors.loginId.message}</p>
                )}
              </div>
              <div className="space-y-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-bold">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    className={`pl-10 pr-10 bg-white border-slate-300 focus:border-[#006699] focus:ring-[#006699]/10 transition-all rounded-xl h-11 ${errors.password ? 'border-red-500' : ''}`}
                    {...register('password')}
                    maxLength={50}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] text-red-500 font-bold ml-1">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {serverError}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 font-bold">
                    Sign In <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2">
            {/* Social logins commented out */}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
