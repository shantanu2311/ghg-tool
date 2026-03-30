'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: 'FY 2023-24', start: '2023-04-01', end: '2024-03-31' },
  { label: 'FY 2024-25', start: '2024-04-01', end: '2025-03-31' },
  { label: 'CY 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Custom', start: '', end: '' },
] as const;

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

export default function StepPeriod() {
  const period = useWizardStore((s) => s.period);
  const update = useWizardStore((s) => s.updatePeriod);

  function getActivePreset(): string {
    const match = PRESETS.find(
      (p) => p.start && p.start === period.startDate && p.end === period.endDate,
    );
    return match ? match.label : 'Custom';
  }

  const activePreset = getActivePreset();

  function handlePreset(preset: (typeof PRESETS)[number]) {
    if (preset.label === 'Custom') {
      // Don't clear — just let user edit
      return;
    }
    update({ startDate: preset.start, endDate: preset.end });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Reporting Period</h2>
      <p className="mt-1 text-sm text-gray-500">
        Select the time period for this GHG inventory. Indian companies typically report on a
        financial year (April to March) basis.
      </p>

      {/* Quick-select buttons */}
      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              activePreset === preset.label
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date pickers */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={period.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={period.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Base Year toggle */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          id="baseYearFlag"
          checked={period.baseYearFlag}
          onChange={(e) => update({ baseYearFlag: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <div>
          <label htmlFor="baseYearFlag" className="text-sm font-medium text-gray-900 cursor-pointer">
            Mark as Base Year
          </label>
          <p className="text-xs text-gray-500">
            The base year is used as the reference point for tracking emission reductions over time.
          </p>
        </div>
      </div>

      {/* Period summary */}
      {period.startDate && period.endDate && (
        <div className="mt-5 rounded-lg bg-teal-50 px-4 py-3">
          <p className="text-sm text-teal-800">
            <span className="font-medium">Selected period:</span>{' '}
            {new Date(period.startDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            to{' '}
            {new Date(period.endDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {period.baseYearFlag && ' (Base Year)'}
          </p>
        </div>
      )}
    </div>
  );
}
