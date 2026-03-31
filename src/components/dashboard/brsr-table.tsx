'use client';

import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine/brsr-mapper';
import { BRSR_FIELDS } from '@/lib/calc-engine/constants';
import type { InventoryResult, BrsrOutput } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BrsrTableProps {
  result: InventoryResult;
}

export default function BrsrTable({ result }: BrsrTableProps) {
  const brsr = mapToBrsr({
    scope1: result.scope1,
    scope2: result.scope2Location,
    scope3: result.scope3,
    biogenicCo2Total: result.biogenicCo2Total,
    energyConsumedGj: result.energyConsumedGj,
    renewablePercent: result.renewablePercent,
    intensityMetrics: result.intensityMetrics,
  });

  const efSources = [...new Set(result.calculations.map((c) => c.efSource))];

  const methodology = generateMethodologyNote({
    gwpReport: result.calculations[0]?.gwpReport ?? 'AR5',
    efSources: efSources.length > 0 ? efSources : ['IPCC 2006', 'CEA'],
    boundaryApproach: 'Operational Control',
    scope3Categories: result.scope3.categories.map((c) => c.category),
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">BRSR Principle 6 Disclosure</CardTitle>
          <CardDescription className="text-[11px]">SEBI BRSR Core fields mapped from calculated inventory</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">Field</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground">Value</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                </tr>
              </thead>
              <tbody>
                {BRSR_FIELDS.map((f, i) => {
                  const value = brsr[f.field as keyof BrsrOutput];
                  return (
                    <tr
                      key={f.field}
                      className="border-b border-border last:border-0 even:bg-muted/30"
                    >
                      <td className="px-5 py-3">{f.label}</td>
                      <td className="px-5 py-3 text-right font-mono">
                        {value != null ? String(value) : 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-muted-foreground hidden sm:table-cell">
                        {f.source}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Methodology Note</CardTitle>
          <CardDescription className="text-[11px]">ISO 14064-1 required disclosure</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-sans">
            {methodology}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
