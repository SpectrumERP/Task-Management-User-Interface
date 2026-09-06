import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * React Router errorElement — app-level route crash / navigation error UI.
 * Does not change API or business logic.
 */
export function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let description = 'This screen hit an unexpected error. You can go home or reload — server data is unchanged.';
  let detail = '';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    description =
      error.status === 404
        ? 'This URL does not match any screen in the app.'
        : error.statusText || description;
    detail = typeof error.data === 'string' ? error.data : '';
  } else if (error instanceof Error) {
    detail = error.message;
  } else if (typeof error === 'string') {
    detail = error;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--tm-page)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)] p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
          <AlertTriangle size={22} strokeWidth={2.25} />
        </div>
        <h1 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h1>
        <p className="mt-1.5 text-xs font-medium text-slate-400 leading-relaxed">{description}</p>
        {detail ? (
          <p className="mt-3 rounded-lg bg-[var(--tm-muted)] px-3 py-2 text-[10px] font-medium text-slate-500 break-words">
            {detail}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/', { replace: true })}
            className="h-9 rounded-xl text-xs font-semibold border-[var(--tm-border)] gap-1.5"
          >
            <Home size={14} />
            Go home
          </Button>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 rounded-xl text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-1.5"
          >
            <RefreshCw size={14} />
            Reload app
          </Button>
        </div>
      </div>
    </div>
  );
}
