'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  SCOPE1_CATEGORIES,
  SCOPE2_CATEGORIES,
  SCOPE3_CATEGORIES,
} from '@/lib/calc-engine/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Building2,
  Calendar,
  CircleCheck,
  BarChart3,
} from 'lucide-react';
import { FieldHelpButton } from '@/components/ai/field-help-button';

// ── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(value: string): string {
  const all = [
    ...SCOPE1_CATEGORIES,
    ...SCOPE2_CATEGORIES,
    ...SCOPE3_CATEGORIES,
  ];
  return all.find((c) => c.value === value)?.label ?? value;
}

// ── Scope Summary Card ───────────────────────────────────────────────────────

interface ScopeEntry {
  sourceCategory: string;
  fuelType: string;
  quantity: number | null;
  unit: string;
  spendInr: number | null;
  inputMode: string;
  dataQualityFlag: string;
  facilityId: string;
}

function fuelLabel(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const QUALITY_DOT: Record<string, string> = {
  PRIMARY: 'bg-emerald-500',
  SECONDARY: 'bg-amber-400',
  ESTIMATED: 'bg-red-400',
};

function ScopeSummaryCard({
  title,
  entries,
  scopeColor,
  facilityMap,
}: {
  title: string;
  entries: ScopeEntry[];
  scopeColor: string;
  facilityMap: Map<string, string>;
}) {
  // Group by category, then list entries within each
  const grouped = useMemo(() => {
    const map = new Map<string, ScopeEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.sourceCategory) ?? [];
      arr.push(e);
      map.set(e.sourceCategory, arr);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <Card className="overflow-hidden">
      <div className={cn('px-4 py-3', scopeColor)}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/80">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
      </div>
      <CardContent className="pt-4">
        {grouped.length > 0 ? (
          <div className="space-y-4">
            {grouped.map(([cat, catEntries]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-card-foreground">{categoryLabel(cat)}</h4>
                  <Badge variant="secondary" className="text-[10px]">{catEntries.length}</Badge>
                </div>
                <div className="space-y-1.5 ml-1 border-l-2 border-border pl-3">
                  {catEntries.map((e, i) => {
                    const facility = facilityMap.get(e.facilityId);
                    const value = e.inputMode === 'quantity' && e.quantity != null
                      ? `${e.quantity.toLocaleString()} ${e.unit}`
                      : e.spendInr != null
                      ? `Rs.${e.spendInr.toLocaleString()}`
                      : '--';
                    return (
                      <div key={i} className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', QUALITY_DOT[e.dataQualityFlag] ?? 'bg-muted-foreground')} />
                          <span className="font-medium text-card-foreground truncate">{fuelLabel(e.fuelType)}</span>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span>{value}</span>
                          {facility && <span className="text-muted-foreground/60">-- {facility}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No data entered</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepReview() {
  const organisation = useWizardStore((s) => s.organisation);
  const facilities = useWizardStore((s) => s.facilities);
  const period = useWizardStore((s) => s.period);
  const scope1Data = useWizardStore((s) => s.scope1Data);
  const scope2Data = useWizardStore((s) => s.scope2Data);
  const scope3Data = useWizardStore((s) => s.scope3Data);
  const productionTonnes = useWizardStore((s) => s.productionTonnes);
  const annualTurnoverLakhInr = useWizardStore((s) => s.annualTurnoverLakhInr);
  const setProductionTonnes = useWizardStore((s) => s.setProductionTonnes);
  const setAnnualTurnover = useWizardStore((s) => s.setAnnualTurnover);
  const isCalculating = useWizardStore((s) => s.isCalculating);
  const setIsCalculating = useWizardStore((s) => s.setIsCalculating);
  const calculationResult = useWizardStore((s) => s.calculationResult);
  const setCalculationResult = useWizardStore((s) => s.setCalculationResult);
  const errors = useWizardStore((s) => s.errors);
  const setErrors = useWizardStore((s) => s.setErrors);

  const [calcStatus, setCalcStatus] = useState('');

  // Data quality breakdown
  const qualityBreakdown = useMemo(() => {
    const all = [...scope1Data, ...scope2Data, ...scope3Data];
    return {
      total: all.length,
      primary: all.filter((e) => e.dataQualityFlag === 'PRIMARY').length,
      secondary: all.filter((e) => e.dataQualityFlag === 'SECONDARY').length,
      estimated: all.filter((e) => e.dataQualityFlag === 'ESTIMATED').length,
    };
  }, [scope1Data, scope2Data, scope3Data]);

  // Warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (scope1Data.length === 0) w.push('No Scope 1 data entered');
    if (scope2Data.length === 0) w.push('No Scope 2 data entered');
    if (scope3Data.length === 0) w.push('No Scope 3 data entered');
    if (facilities.length === 0) w.push('No facilities defined');
    if (!organisation.name) w.push('Organisation name is missing');
    if (!period.startDate || !period.endDate) w.push('Reporting period dates are incomplete');

    const allEntries = [...scope1Data, ...scope2Data, ...scope3Data];
    const noFacility = allEntries.filter((e) => !e.facilityId);
    if (noFacility.length > 0) w.push(`${noFacility.length} entries have no facility assigned`);

    const noFuel = allEntries.filter((e) => !e.fuelType);
    if (noFuel.length > 0) w.push(`${noFuel.length} entries have no source/fuel type selected`);

    return w;
  }, [scope1Data, scope2Data, scope3Data, facilities, organisation, period]);

  // ── Calculate handler ────────────────────────────────────────────────────

  async function handleCalculate() {
    setErrors([]);
    setIsCalculating(true);
    setCalcStatus('Creating organisation...');

    try {
      // 1. Create organisation
      const orgRes = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organisation),
      });
      if (!orgRes.ok) {
        const errBody = await orgRes.json().catch(() => null);
        throw new Error(`Organisation creation failed: ${errBody?.error ?? orgRes.statusText}`);
      }
      const orgData = await orgRes.json();
      const organisationId = orgData.id;

      // 2. Create facilities
      setCalcStatus('Creating facilities...');
      const facilityIdMap = new Map<string, string>();
      for (const facility of facilities) {
        const facRes = await fetch('/api/facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...facility, organisationId }),
        });
        if (!facRes.ok) {
          const errBody = await facRes.json().catch(() => null);
          throw new Error(`Facility creation failed: ${errBody?.error ?? facRes.statusText}`);
        }
        const facData = await facRes.json();
        facilityIdMap.set(facility.id, facData.id);
      }

      // 3. Create period
      setCalcStatus('Creating reporting period...');
      const periodRes = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...period, organisationId }),
      });
      if (!periodRes.ok) {
        const errBody = await periodRes.json().catch(() => null);
        throw new Error(`Period creation failed: ${errBody?.error ?? periodRes.statusText}`);
      }
      const periodData = await periodRes.json();
      const periodId = periodData.id;

      // 4. Bulk create activity data
      setCalcStatus('Uploading activity data...');
      const allActivities = [
        ...scope1Data.map((e) => ({ ...e, scope: 1 as const, facilityId: facilityIdMap.get(e.facilityId) ?? e.facilityId })),
        ...scope2Data.map((e) => ({ ...e, scope: 2 as const, facilityId: facilityIdMap.get(e.facilityId) ?? e.facilityId })),
        ...scope3Data.map((e) => ({ ...e, scope: 3 as const, facilityId: facilityIdMap.get(e.facilityId) ?? e.facilityId })),
      ];

      const actRes = await fetch('/api/activity-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId, activities: allActivities }),
      });
      if (!actRes.ok) {
        const errBody = await actRes.json().catch(() => null);
        throw new Error(`Activity data upload failed: ${errBody?.error ?? actRes.statusText}`);
      }

      // 5. Trigger calculation
      setCalcStatus('Running calculations...');
      const calcRes = await fetch(`/api/calculate/${periodId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionTonnes: productionTonnes ?? undefined,
          annualTurnoverLakhInr: annualTurnoverLakhInr ?? undefined,
        }),
      });
      if (!calcRes.ok) {
        const errBody = await calcRes.json().catch(() => null);
        throw new Error(`Calculation failed: ${errBody?.error ?? calcRes.statusText}`);
      }
      const result = await calcRes.json();

      // 6. Store result
      setCalculationResult(result);
      setCalcStatus('Done!');

      // Show calculation errors (unmatched EFs, conversion failures) as warnings
      if (result.calculationErrors?.length > 0) {
        setErrors(result.calculationErrors.map((e: { activityId: string; error: string }) => e.error));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed';
      setErrors([message]);
      setCalcStatus('');
    } finally {
      setIsCalculating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Review &amp; Calculate</CardTitle>
            <FieldHelpButton step="review" />
          </div>
          <CardDescription>
            Review your data entries, add production and turnover figures, then calculate
            your GHG inventory.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Organisation & Period summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Organisation &amp; Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Organisation:</span>{' '}
              <span className="font-medium">{organisation.name || '(not set)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Sector:</span>{' '}
              <span className="font-medium">{organisation.sector}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Facilities:</span>{' '}
              <span className="font-medium">{facilities.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Period:</span>{' '}
              <span className="font-medium">
                {period.startDate && period.endDate
                  ? `${period.startDate} to ${period.endDate}`
                  : '(not set)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope summaries */}
      {(() => {
        const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScopeSummaryCard
              title="Scope 1 -- Direct"
              entries={scope1Data}
              scopeColor="bg-rose-600"
              facilityMap={facilityMap}
            />
            <ScopeSummaryCard
              title="Scope 2 -- Energy"
              entries={scope2Data}
              scopeColor="bg-amber-600"
              facilityMap={facilityMap}
            />
            <ScopeSummaryCard
              title="Scope 3 -- Value Chain"
              entries={scope3Data}
              scopeColor="bg-blue-600"
              facilityMap={facilityMap}
            />
          </div>
        );
      })()}

      {/* Data Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          {qualityBreakdown.total > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {qualityBreakdown.primary > 0 && (
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(qualityBreakdown.primary / qualityBreakdown.total) * 100}%` }}
                    />
                  )}
                  {qualityBreakdown.secondary > 0 && (
                    <div
                      className="bg-amber-400 transition-all"
                      style={{ width: `${(qualityBreakdown.secondary / qualityBreakdown.total) * 100}%` }}
                    />
                  )}
                  {qualityBreakdown.estimated > 0 && (
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${(qualityBreakdown.estimated / qualityBreakdown.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Primary ({qualityBreakdown.primary})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Secondary ({qualityBreakdown.secondary})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Estimated ({qualityBreakdown.estimated})
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No data entries to assess</p>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Production & Turnover */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Intensity Metrics</CardTitle>
          <CardDescription className="text-xs">
            Required for BRSR emission intensity calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prod-tonnes">Total Production (tonnes)</Label>
              <Input
                id="prod-tonnes"
                type="number"
                placeholder="e.g. 50000"
                value={productionTonnes ?? ''}
                onChange={(e) =>
                  setProductionTonnes(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="turnover">Annual Turnover (lakh INR)</Label>
              <Input
                id="turnover"
                type="number"
                placeholder="e.g. 500"
                value={annualTurnoverLakhInr ?? ''}
                onChange={(e) =>
                  setAnnualTurnover(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <Card>
        <CardContent className="pt-2">
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || qualityBreakdown.total === 0}
            className="w-full gap-2"
            size="lg"
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {calcStatus || 'Calculating...'}
              </>
            ) : (
              'Calculate GHG Inventory'
            )}
          </Button>

          {qualityBreakdown.total === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Add at least one activity data entry to enable calculation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-destructive">{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Result summary */}
      {calculationResult && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CircleCheck className="h-4 w-4" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Grand Total</p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {calculationResult.grandTotal.toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">tCO2e</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Scope 1</p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {calculationResult.scope1.total.toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">tCO2e</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Scope 2</p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {calculationResult.scope2Location.total.toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">tCO2e</p>
              </div>
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Scope 3</p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {calculationResult.scope3.total.toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">tCO2e</p>
              </div>
            </div>

            {/* Intensity metrics */}
            {(calculationResult.intensityMetrics.perProduct !== null ||
              calculationResult.intensityMetrics.perTurnover !== null) && (
              <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3">
                <h4 className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Intensity Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  {calculationResult.intensityMetrics.perProduct !== null && (
                    <div className="text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">Per tonne of product: </span>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {calculationResult.intensityMetrics.perProduct.toFixed(4)} tCO2e/t
                      </span>
                    </div>
                  )}
                  {calculationResult.intensityMetrics.perTurnover !== null && (
                    <div className="text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">Per lakh turnover: </span>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {calculationResult.intensityMetrics.perTurnover.toFixed(4)} tCO2e/lakh
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data quality grade */}
            <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Data Quality Grade:{' '}
                <Badge variant="outline" className="ml-1 text-emerald-900 dark:text-emerald-200 border-emerald-300">
                  {calculationResult.dataQuality.grade} ({calculationResult.dataQuality.overall}/100)
                </Badge>
              </p>
            </div>

            {/* Link to dashboard */}
            <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                View Full Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
