import { useState, useEffect } from 'react';
import { Download, X, Share, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone/installed mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    // Check device type
    const checkDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isAppleDevice);
    };

    checkStandalone();
    checkDevice();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser-driven automatic install prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show banner if not standalone and not dismissed recently
      const isDismissed = localStorage.getItem('taskflow_pwa_dismissed') === 'true';
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: If on iOS and not standalone, show PWA instructions after 8 seconds
    const iosTimeout = setTimeout(() => {
      const isDismissed = localStorage.getItem('taskflow_pwa_dismissed') === 'true';
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

      if (isApple && !isStandaloneMode && !isDismissed) {
        setIsVisible(true);
      }
    }, 8000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(iosTimeout);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Trigger the browser's install dialog prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setIsVisible(false);
    } else {
      console.log('User dismissed the PWA install prompt');
    }

    // Clear the prompt since it can only be used once
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Persist dismiss state in localStorage for 7 days
    localStorage.setItem('taskflow_pwa_dismissed', 'true');
  };

  // If already standalone or not visible, render nothing
  if (isStandalone || !isVisible) return null;

  // Render PWA Banner if there is a prompt or if we are on iOS Safari
  const showiOSInstructions = isIOS && !deferredPrompt;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-2xl shadow-slate-950/50 flex flex-col gap-3 relative overflow-hidden">
        {/* Decorative subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00b4d8] to-transparent opacity-60" />

        {/* Header Block */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {/* App Icon Container */}
            <img
              src="/pwa-192x192.png"
              alt="Steel Mont"
              className="h-11 w-11 rounded-xl object-cover border border-slate-700/50 shadow-md shadow-[#006699]/10 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-black text-white leading-snug flex items-center gap-1.5">
                Install Task & Planner App
                <Sparkles size={12} className="text-[#00b4d8] animate-pulse" />
              </h4>
              <p className="text-[10.5px] font-bold text-slate-400 leading-normal">
                Add to your home screen for quick offline access and app-like performance!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-500 hover:text-white hover:bg-slate-800/80 p-1.5 rounded-lg transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action / Instruction Block */}
        {showiOSInstructions ? (
          /* iOS Safari Manual Install Callout */
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[9.5px] font-black text-[#00b4d8]   block">iOS Safari Instructions</span>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-300 font-bold leading-relaxed">
              <div className="h-6 w-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                <Share size={11} strokeWidth={2.5} />
              </div>
              <p>
                Tap the <span className="font-extrabold text-white">Share</span> button in your browser navigation bar, then select <span className="font-extrabold text-white">Add to Home Screen</span>.
              </p>
            </div>
          </div>
        ) : (
          /* Android/Chrome Native Prompt Button */
          <div className="flex items-center gap-2 mt-1">
            <Button
              type="button"
              onClick={handleInstallClick}
              disabled={!deferredPrompt}
              className="flex-1 h-9 text-xs font-black uppercase tracking-widest gap-1.5 rounded-xl bg-gradient-to-r from-[#006699] to-[#00b4d8] hover:from-[#005580] hover:to-[#0096c7] text-white shadow-lg shadow-[#006699]/15 border border-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download size={13} strokeWidth={2.5} />
              Install Application
            </Button>
            <Button
              type="button"
              onClick={handleDismiss}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-800 bg-transparent text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Later
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
