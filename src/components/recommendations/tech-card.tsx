'use client';

import type { TechWithFunding } from '@/lib/rec-engine/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Landmark } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Energy Efficiency - Cross Sector': 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Sector Specific - Iron & Steel': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sector Specific - Brick Kilns': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sector Specific - Textiles': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Green Electricity': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Alternative Fuels': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const READINESS_BADGE: Record<string, string> = {
  'Commercially mature': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Early commercial': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Emerging': 'bg-muted text-muted-foreground',
};

interface Props {
  tech: TechWithFunding;
  enabled: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

export function TechCard({ tech, enabled, selected, onToggle, onSelect }: Props) {
  const catColor = CATEGORY_COLORS[tech.category] ?? 'bg-muted text-muted-foreground';
  const readinessClass = READINESS_BADGE[tech.technologyReadiness] ?? 'bg-muted text-muted-foreground';

  return (
    <Card
      className={cn(
        'p-4 transition-all cursor-pointer',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : enabled
          ? 'border-primary/30 shadow-sm'
          : 'hover:border-border/80',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={cn('text-[10px]', catColor)}>
              {tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}
            </Badge>
            <Badge className={cn('text-[10px]', readinessClass)}>
              {tech.technologyReadiness}
            </Badge>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-tight">{tech.name}</h3>
        </div>
        <Switch
          size="sm"
          checked={enabled}
          onCheckedChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">CO2 reduction</span>
          <p className="font-medium">
            {tech.reductionMinTonnes.toFixed(0)}--{tech.reductionMaxTonnes.toFixed(0)} t
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Payback</span>
          <p className="font-medium">
            {tech.paybackMinYears === 0 && tech.paybackMaxYears === 0
              ? 'Zero upfront'
              : `${tech.paybackMinYears}--${tech.paybackMaxYears} yrs`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">CAPEX</span>
          <p className="font-medium">
            {tech.capexMinLakhs === null || tech.capexMinLakhs === 0
              ? 'N/A'
              : `Rs.${tech.capexMinLakhs}--${tech.capexMaxLakhs}L`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Impact on total</span>
          <p className="font-medium">{tech.pctOfTotal.toFixed(1)}%</p>
        </div>
      </div>

      {tech.warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-1">
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
          <div>
            {tech.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400">{w}</p>
            ))}
          </div>
        </div>
      )}

      {tech.fundingMatches.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-primary">
          <Landmark className="h-3 w-3" />
          {tech.fundingMatches.length} funding scheme{tech.fundingMatches.length > 1 ? 's' : ''} available
        </div>
      )}
    </Card>
  );
}
