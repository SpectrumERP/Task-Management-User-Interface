import {
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { forceStartOnboardingTour } from '@/components/layout/OnboardingSpotlightTour';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';

interface FullscreenHelpGuideProps {
  className?: string;
  /** kept for callers — unused (tour is triggered manually / after login) */
  autoOpenOnce?: boolean;
}

export function FullscreenHelpGuide({ className }: FullscreenHelpGuideProps) {
  return (
    <ActionTip label="Help">
      <Button
        type="button"
        variant="outline"
        onClick={() => forceStartOnboardingTour()}
        aria-label="Help"
        className={cn(
          'h-9 w-9 p-0 rounded-[8px] text-[#0EA5E9] border-[#0EA5E9]/35 bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 shadow-none',
          className
        )}
        data-tour="help"
      >
        <HelpCircle size={16} />
      </Button>
    </ActionTip>
  );
}
