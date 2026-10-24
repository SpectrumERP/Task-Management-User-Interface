import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BootShell } from '@/components/ui/BootShell';
import { Button } from '@/components/ui/button';
import { crmLoginUrl, redirectToCrmLogin } from '@/lib/crmSso';

/**
 * Stands in for the login page (this app has none): sign-in happens on the Spectrum ERP login, which
 * returns the user to the page they asked for.
 */
export function CrmLoginRedirect() {
  const location = useLocation();
  const [stuck, setStuck] = useState(false);
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const returnTo = from?.pathname && from.pathname !== '/login' ? `${from.pathname}${from.search ?? ''}` : '/';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the redirect is the effect; staying here means it was refused
    if (!redirectToCrmLogin(returnTo)) setStuck(true);
  }, [returnTo]);

  if (!stuck) return <BootShell login label="Opening sign in" />;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-lg font-bold text-slate-50">Couldn't use your Spectrum ERP sign-in</h1>
        <p className="text-sm text-slate-300">
          Task Management could not read your Spectrum ERP session. Sign in to Spectrum ERP again, then reopen Tasks.
        </p>
        <Button onClick={() => window.location.assign(crmLoginUrl(returnTo))}>Go to sign in</Button>
      </div>
    </div>
  );
}
