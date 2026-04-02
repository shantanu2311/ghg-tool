'use client';

import { useJargon } from './jargon-provider';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface JargonTermProps {
  term: string;
  children?: React.ReactNode;
}

export function JargonTerm({ term, children }: JargonTermProps) {
  const { jargonMap } = useJargon();
  const entry = jargonMap.get(term);

  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<span className="border-b border-dotted border-muted-foreground/50 cursor-help text-foreground" />}
        >
          {children ?? term}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground">
            {entry.term} — {entry.fullForm}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {entry.explanation}
          </p>
          {entry.whoDoesIt && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Who does it:</span> {entry.whoDoesIt}
            </p>
          )}
          {entry.typicalCostInr && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Cost:</span> {entry.typicalCostInr}
            </p>
          )}
          {entry.isReimbursed && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">Reimbursed:</span> {entry.isReimbursed}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
