import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional label for logging / UI */
  label?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * App-level React crash recovery. Does not change API or business logic.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}] UI crashed:`, error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--tm-page)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)] p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
            <AlertTriangle size={22} strokeWidth={2.25} />
          </div>
          <h1 className="text-base font-semibold text-slate-100 tracking-tight">Something went wrong</h1>
          <p className="mt-1.5 text-xs font-medium text-slate-400 leading-relaxed">
            The app hit an unexpected error. You can try again or reload. Your data on the server is unchanged.
          </p>
          {this.state.message ? (
            <p className="mt-3 rounded-lg bg-[var(--tm-muted)] px-3 py-2 text-[10px] font-medium text-slate-500 break-words">
              {this.state.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={this.handleReset}
              className="h-9 rounded-xl text-xs font-semibold border-[var(--tm-border)]"
            >
              Try again
            </Button>
            <Button
              type="button"
              onClick={this.handleReload}
              className="h-9 rounded-xl text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            >
              Reload app
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
