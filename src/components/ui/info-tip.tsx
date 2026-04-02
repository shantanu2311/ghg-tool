'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface InfoTipProps {
  /** Tooltip text — keep it concise (1-2 sentences) */
  text: string;
  /** Position relative to the icon */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra CSS classes on the icon wrapper */
  className?: string;
}

/**
 * Tiny info icon with a hover tooltip.
 * Use inline next to labels, headers, metrics, etc.
 *
 * Usage: <Label>Company Name <InfoTip text="Legal entity name as per UDYAM registration" /></Label>
 */
export function InfoTip({ text, side = 'top', className }: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={`inline-flex items-center justify-center align-middle cursor-help ${className ?? ''}`}
          />
        }
      >
        <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
