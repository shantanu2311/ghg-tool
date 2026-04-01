'use client';

import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelpStore } from '@/lib/help-store';
import { useWizardStore } from '@/lib/store';
import { getSuggestedQuestions } from '@/lib/ai/suggested-questions';

/** Map wizard step number (1-7) to suggested-questions key */
const STEP_KEY_MAP: Record<number, string> = {
  1: 'organisation',
  2: 'facilities',
  3: 'period',
  4: 'scope1',
  5: 'scope2',
  6: 'scope3',
  7: 'review',
};

/** Derive the help context key from current route + wizard step */
function useCurrentHelpStep(): string {
  const pathname = usePathname();
  const wizardStep = useWizardStore((s) => s.currentStep);

  if (pathname.startsWith('/wizard')) {
    return STEP_KEY_MAP[wizardStep] || 'organisation';
  }
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/recommendations')) return 'recommendations';
  if (pathname.startsWith('/funding')) return 'funding';
  return 'organisation';
}

export function HelpFab() {
  const { isOpen, open, setContext, setSuggestedQuestions } = useHelpStore();
  const stepKey = useCurrentHelpStep();

  if (isOpen) return null;

  const handleClick = () => {
    const ctx = { currentStep: stepKey };
    setContext(ctx);
    setSuggestedQuestions(getSuggestedQuestions(stepKey, 3));
    open(ctx);
  };

  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-30"
      onClick={handleClick}
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  );
}
