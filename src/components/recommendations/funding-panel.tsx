'use client';

import type { TechWithFunding } from '@/lib/rec-engine/types';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Landmark, ExternalLink, FileText, HandCoins } from 'lucide-react';

interface Props {
  tech: TechWithFunding | null;
}

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Proposed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Closed: 'bg-muted text-muted-foreground',
};

export function FundingPanel({ tech }: Props) {
  if (!tech) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Funding Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Select a technology to see applicable government schemes and subsidies.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          Funding for {tech.name}
        </CardTitle>
        <CardDescription className="text-[11px]">
          Estimated CAPEX: {tech.capexMinLakhs !== null ? `Rs.${tech.capexMinLakhs}--${tech.capexMaxLakhs} Lakhs` : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tech.fundingMatches.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No specific funding schemes mapped for this technology.</p>
        ) : (
          <div className="space-y-3">
            {tech.fundingMatches.map((fm) => (
              <div key={fm.schemeId} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold">{fm.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{fm.implementingAgency}</p>
                  </div>
                  <Badge className={cn('text-[9px]', STATUS_BADGE[fm.status] ?? 'bg-muted text-muted-foreground')}>
                    {fm.status}
                  </Badge>
                </div>

                <p className="mt-1.5 text-[11px] text-muted-foreground">{fm.supportType}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">{fm.financialDetails}</p>

                {fm.subsidyPct !== null && (
                  <p className="mt-1 text-[11px] font-medium text-primary">
                    <HandCoins className="inline h-3 w-3 mr-0.5" />
                    Subsidy: {fm.subsidyPct}%
                    {fm.netCapexMinLakhs !== null && (
                      <> -- Net cost: Rs.{fm.netCapexMinLakhs.toFixed(1)}--{fm.netCapexMaxLakhs?.toFixed(1)} Lakhs</>
                    )}
                  </p>
                )}

                {fm.notes && (
                  <p className="mt-1 text-[10px] text-muted-foreground italic">{fm.notes}</p>
                )}

                {fm.requiredDocuments && fm.requiredDocuments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" />
                      Required documents:
                    </p>
                    <ul className="mt-0.5 space-y-0.5">
                      {fm.requiredDocuments.map((doc, i) => (
                        <li key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fm.applicationUrl && (
                  <a
                    href={fm.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Apply Online
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {tech.bestNetCapexMinLakhs !== null && tech.bestNetCapexMaxLakhs !== null && (
          <div className="mt-3 rounded-lg bg-primary/10 p-3">
            <p className="text-[11px] font-medium text-primary">
              Best net cost after subsidy: Rs.{tech.bestNetCapexMinLakhs.toFixed(1)}--{tech.bestNetCapexMaxLakhs.toFixed(1)} Lakhs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
