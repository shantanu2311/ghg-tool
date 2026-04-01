'use client';

import { HelpCircle } from 'lucide-react';
import { useHelpStore } from '@/lib/help-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  step: string;
  field?: string;
  scope?: number;
  category?: string;
  fuelType?: string;
  /** Optional pre-filled question when clicked */
  question?: string;
}

export function FieldHelpButton({ step, field, scope, category, fuelType, question }: Props) {
  const { open, setContext, ask, setSuggestedQuestions } = useHelpStore();

  const handleClick = () => {
    const ctx = {
      currentStep: step,
      currentField: field,
      currentScope: scope,
      currentCategory: category,
      currentFuelType: fuelType,
    };
    setContext(ctx);

    // Import suggested questions dynamically to avoid circular deps
    import('@/lib/ai/suggested-questions').then(({ SUGGESTED_QUESTIONS }) => {
      const stepQuestions = SUGGESTED_QUESTIONS[step] || [];
      setSuggestedQuestions(stepQuestions);
    }).catch(() => {
      // Fallback if file doesn't exist yet
    });

    open(ctx);

    // If a specific question is provided, ask it immediately
    if (question) {
      ask(question);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={handleClick}
          />
        }
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        Ask AI about this
      </TooltipContent>
    </Tooltip>
  );
}
