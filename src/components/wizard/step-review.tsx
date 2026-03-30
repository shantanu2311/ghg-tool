'use client';

import { useMemo, useState } from 'react';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  SCOPE1_CATEGORIES,
  SCOPE2_CATEGORIES,
  SCOPE3_CATEGORIES,
} from '@/lib/calc-engine/constants';

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

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

function ScopeSummaryCard({
  title,
  entries,
  scopeColor,
}: {
  title: string;
  entries: { sourceCategory: string; fuelType: string; quantity: number | null; spendInr: number | null; inputMode: string; dataQualityFlag: string }[];
  scopeColor: string;
}) {
  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.sourceCategory, (map.get(e.sourceCategory) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className={cn('px-5 py-3', scopeColor)}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/80">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
      </div>
      <div className="px-5 py-4">
        {grouped.length > 0 ? (
          <div className="space-y-2">
            {grouped.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{categoryLabel(cat)}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No data entered</p>
        )}
      </div>
    </div>
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
      if (!orgRes.ok) throw new Error(`Organisation creation failed: ${orgRes.statusText}`);
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
        if (!facRes.ok) throw new Error(`Facility creation failed: ${facRes.statusText}`);
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
      if (!periodRes.ok) throw new Error(`Period creation failed: ${periodRes.statusText}`);
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
      if (!actRes.ok) throw new Error(`Activity data upload failed: ${actRes.statusText}`);

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
      if (!calcRes.ok) throw new Error(`Calculation failed: ${calcRes.statusText}`);
      const result = await calcRes.json();

      // 6. Store result
      setCalculationResult(result);
      setCalcStatus('Done!');
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Review &amp; Calculate</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your data entries, add production and turnover figures, then calculate
          your GHG inventory.
        </p>
      </div>

      {/* Organisation & Period summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Organisation &amp; Period</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-gray-500">Organisation:</span>{' '}
            <span className="font-medium text-gray-900">{organisation.name || '(not set)'}</span>
          </div>
          <div>
            <span className="text-gray-500">Sector:</span>{' '}
            <span className="font-medium text-gray-900">{organisation.sector}</span>
          </div>
          <div>
            <span className="text-gray-500">Facilities:</span>{' '}
            <span className="font-medium text-gray-900">{facilities.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Period:</span>{' '}
            <span className="font-medium text-gray-900">
              {period.startDate && period.endDate
                ? `${period.startDate} to ${period.endDate}`
                : '(not set)'}
            </span>
          </div>
        </div>
      </div>

      {/* Scope summaries */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScopeSummaryCard
          title="Scope 1 — Direct"
          entries={scope1Data}
          scopeColor="bg-rose-600"
        />
        <ScopeSummaryCard
          title="Scope 2 — Energy"
          entries={scope2Data}
          scopeColor="bg-amber-600"
        />
        <ScopeSummaryCard
          title="Scope 3 — Value Chain"
          entries={scope3Data}
          scopeColor="bg-blue-600"
        />
      </div>

      {/* Data Quality */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Quality</h3>
        {qualityBreakdown.total > 0 ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
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
            <div className="flex items-center gap-3 text-xs text-gray-600">
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
          <p className="text-xs text-gray-400 italic">No data entries to assess</p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">Warnings</h3>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Production & Turnover */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Intensity Metrics</h3>
        <p className="text-xs text-gray-500 mb-4">
          Required for BRSR emission intensity calculations.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Total Production (tonnes)
            </label>
            <input
              type="number"
              className={inputClass}
              placeholder="e.g. 50000"
              value={productionTonnes ?? ''}
              onChange={(e) =>
                setProductionTonnes(e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Annual Turnover (lakh INR)
            </label>
            <input
              type="number"
              className={inputClass}
              placeholder="e.g. 500"
              value={annualTurnoverLakhInr ?? ''}
              onChange={(e) =>
                setAnnualTurnover(e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={isCalculating || qualityBreakdown.total === 0}
          className={cn(
            'w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors',
            isCalculating || qualityBreakdown.total === 0
              ? 'cursor-not-allowed bg-teal-300'
              : 'bg-teal-600 hover:bg-teal-700',
          )}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {calcStatus || 'Calculating...'}
            </span>
          ) : (
            'Calculate GHG Inventory'
          )}
        </button>

        {qualityBreakdown.total === 0 && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Add at least one activity data entry to enable calculation.
          </p>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Errors</h3>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-red-800">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Result summary */}
      {calculationResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-900 mb-3">Calculation Results</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-emerald-700">Grand Total</p>
              <p className="text-lg font-bold text-emerald-900">
                {calculationResult.grandTotal.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600">tCO2e</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Scope 1</p>
              <p className="text-lg font-bold text-emerald-900">
                {calculationResult.scope1.total.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600">tCO2e</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Scope 2</p>
              <p className="text-lg font-bold text-emerald-900">
                {calculationResult.scope2Location.total.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600">tCO2e</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Scope 3</p>
              <p className="text-lg font-bold text-emerald-900">
                {calculationResult.scope3.total.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600">tCO2e</p>
            </div>
          </div>

          {/* Intensity metrics */}
          {(calculationResult.intensityMetrics.perProduct !== null ||
            calculationResult.intensityMetrics.perTurnover !== null) && (
            <div className="mt-4 border-t border-emerald-200 pt-3">
              <h4 className="text-xs font-semibold text-emerald-800 mb-2">Intensity Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                {calculationResult.intensityMetrics.perProduct !== null && (
                  <div className="text-xs">
                    <span className="text-emerald-700">Per tonne of product: </span>
                    <span className="font-semibold text-emerald-900">
                      {calculationResult.intensityMetrics.perProduct.toFixed(4)} tCO2e/t
                    </span>
                  </div>
                )}
                {calculationResult.intensityMetrics.perTurnover !== null && (
                  <div className="text-xs">
                    <span className="text-emerald-700">Per lakh turnover: </span>
                    <span className="font-semibold text-emerald-900">
                      {calculationResult.intensityMetrics.perTurnover.toFixed(4)} tCO2e/lakh
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data quality grade */}
          <div className="mt-4 border-t border-emerald-200 pt-3">
            <p className="text-xs text-emerald-700">
              Data Quality Grade:{' '}
              <span className="font-semibold text-emerald-900">
                {calculationResult.dataQuality.grade} ({calculationResult.dataQuality.overall}/100)
              </span>
            </p>
          </div>

          {/* Link to dashboard */}
          <div className="mt-4">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              View Full Dashboard
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
