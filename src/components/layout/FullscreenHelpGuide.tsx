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
          'h-8 w-8 p-0 rounded-lg border border-[#CBD5E1] bg-[#eef3fc] text-[#1E56A0] hover:border-[#1E56A0] hover:bg-[#eef3fc] active:scale-95 shadow-none transition-[background-color,border-color,color,transform] duration-200',
          className
        )}
        data-tour="help"
      >
        <HelpCircle size={16} />
      </Button>
    </ActionTip>
  );
}
