'use client';

import { useState } from 'react';
import { ChevronRight, Clock, IndianRupee, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DocumentChecklist } from './document-checklist';
import { JargonTerm } from './jargon-term';

export interface ActionStepData {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[] | null;
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
}

interface ActionStepProps {
  step: ActionStepData;
  isLast: boolean;
}

// Terms to auto-link in descriptions
const JARGON_TERMS = ['DEA', 'IGEA', 'DPR', 'ESCO', 'M&V', 'CGTMSE', 'PRSF', 'EOI', 'PPA', 'RESCO', 'CEA', 'AEA', 'NCV', 'SDA', 'EPC'];

function renderWithJargon(text: string) {
  // Split by jargon terms and wrap matches in JargonTerm
  const regex = new RegExp(`\\b(${JARGON_TERMS.join('|')})\\b`, 'g');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    JARGON_TERMS.includes(part) ? (
      <JargonTerm key={i} term={part} />
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function ActionStep({ step, isLast }: ActionStepProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xs font-bold text-primary">
          {step.stepNumber}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left group"
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {step.title}
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {step.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {step.estimatedTime}
                </span>
              )}
              {step.estimatedCost && (
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {step.estimatedCost}
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform mt-0.5',
              expanded && 'rotate-90',
            )}
          />
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            {/* Description with jargon auto-linking */}
            <p className="text-xs text-foreground leading-relaxed">
              {renderWithJargon(step.description)}
            </p>

            {/* Tips */}
            {step.tips && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Tip:</span> {step.tips}
                </p>
              </div>
            )}

            {/* Documents checklist */}
            {step.documentsNeeded && step.documentsNeeded.length > 0 && (
              <DocumentChecklist documents={step.documentsNeeded} />
            )}

            {/* Action button */}
            {step.actionUrl && (
              <a href={step.actionUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  {step.actionLabel ?? 'Open Link'}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
