'use client';

import { useState } from 'react';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SCOPE3_CATEGORIES } from '@/lib/calc-engine/constants';
import { useFuelOptions } from '@/lib/hooks/use-fuel-options';
import type { ActivityEntry } from '@/lib/store';
import type { FuelOption } from '@/lib/hooks/use-fuel-options';

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

const selectClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

const DATA_QUALITY_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary (metered/invoiced)' },
  { value: 'SECONDARY', label: 'Secondary (industry average)' },
  { value: 'ESTIMATED', label: 'Estimated' },
] as const;

// ── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  sourceOptions,
  onUpdate,
  onRemove,
  facilities,
}: {
  entry: ActivityEntry;
  sourceOptions: FuelOption[];
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  facilities: { id: string; name: string }[];
}) {
  const selectedSource = sourceOptions.find((f) => f.value === entry.fuelType);
  const defaultUnit = selectedSource?.unit ?? '';

  function handleSourceChange(fuelType: string) {
    const source = sourceOptions.find((f) => f.value === fuelType);
    onUpdate(entry.id, { fuelType, unit: source?.unit ?? '' });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Facility */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Facility</label>
          <select
            className={selectClass}
            value={entry.facilityId}
            onChange={(e) => onUpdate(entry.id, { facilityId: e.target.value })}
          >
            <option value="">Select facility</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name || 'Unnamed Facility'}</option>
            ))}
          </select>
        </div>

        {/* Source Type */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Source Type</label>
          <select
            className={selectClass}
            value={entry.fuelType}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            <option value="">Select type</option>
            {sourceOptions.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Input Mode Toggle */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Input Mode</label>
          <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdate(entry.id, { inputMode: 'quantity' })}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                entry.inputMode === 'quantity'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              Quantity
            </button>
            <button
              type="button"
              onClick={() => onUpdate(entry.id, { inputMode: 'spend', dataQualityFlag: 'ESTIMATED' })}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                entry.inputMode === 'spend'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              Spend (INR)
            </button>
          </div>
        </div>

        {/* Quantity or Spend */}
        {entry.inputMode === 'quantity' ? (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Quantity ({defaultUnit || 'unit'})
            </label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={entry.quantity ?? ''}
              onChange={(e) =>
                onUpdate(entry.id, {
                  quantity: e.target.value ? Number(e.target.value) : null,
                  unit: defaultUnit,
                })
              }
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Spend (INR)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={entry.spendInr ?? ''}
              onChange={(e) =>
                onUpdate(entry.id, {
                  spendInr: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        )}

        {/* Data Quality */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Data Quality</label>
          <select
            className={selectClass}
            value={entry.dataQualityFlag}
            onChange={(e) =>
              onUpdate(entry.id, { dataQualityFlag: e.target.value as 'PRIMARY' | 'SECONDARY' | 'ESTIMATED' })
            }
          >
            {DATA_QUALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Description (optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Supplier name, route details"
            value={entry.description}
            onChange={(e) => onUpdate(entry.id, { description: e.target.value })}
          />
        </div>
      </div>

      {/* Remove */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Collapsible Category Section ─────────────────────────────────────────────

function CategorySection({
  category,
  label,
  entries,
  sourceOptions,
  facilities,
  onAdd,
  onUpdate,
  onRemove,
  notApplicable,
  onToggleNA,
}: {
  category: string;
  label: string;
  entries: ActivityEntry[];
  sourceOptions: FuelOption[];
  facilities: { id: string; name: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  notApplicable: boolean;
  onToggleNA: () => void;
}) {
  const [expanded, setExpanded] = useState(entries.length > 0);

  return (
    <div className={cn(
      'rounded-xl border bg-white shadow-sm overflow-hidden',
      notApplicable ? 'border-gray-100 opacity-60' : 'border-gray-200',
    )}>
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              expanded && 'rotate-90',
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {notApplicable && ' — marked as N/A'}
            </p>
          </div>
        </div>
        {/* Entry count badge */}
        {entries.length > 0 && !notApplicable && (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
            {entries.length}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          {/* Not Applicable toggle */}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              checked={notApplicable}
              onChange={(e) => {
                e.stopPropagation();
                onToggleNA();
              }}
            />
            Not Applicable — this category does not apply to our operations
          </label>

          {!notApplicable && (
            <>
              {entries.length > 0 ? (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      sourceOptions={sourceOptions}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      facilities={facilities}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center">
                  <p className="text-xs text-gray-400">No entries yet.</p>
                </div>
              )}

              <button
                type="button"
                onClick={onAdd}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
              >
                + Add Entry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepScope3() {
  const facilities = useWizardStore((s) => s.facilities);
  const scope3Data = useWizardStore((s) => s.scope3Data);
  const addActivity = useWizardStore((s) => s.addActivity);
  const updateActivity = useWizardStore((s) => s.updateActivity);
  const removeActivity = useWizardStore((s) => s.removeActivity);
  const { optionsByCategory, loading } = useFuelOptions(3);

  // Track which categories are marked N/A (local UI state, not persisted)
  const [naCategories, setNaCategories] = useState<Set<string>>(new Set());

  function handleAdd(category: string) {
    const defaultFacilityId = facilities.length > 0 ? facilities[0].id : '';
    addActivity(3, {
      facilityId: defaultFacilityId,
      sourceCategory: category,
      fuelType: '',
      description: '',
      inputMode: 'quantity',
      quantity: null,
      unit: '',
      spendInr: null,
      dataQualityFlag: 'SECONDARY',
      month: null,
    });
  }

  function handleUpdate(id: string, data: Partial<Omit<ActivityEntry, 'id'>>) {
    updateActivity(3, id, data);
  }

  function handleRemove(id: string) {
    removeActivity(3, id);
  }

  function toggleNA(category: string) {
    setNaCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Scope 3 — Value Chain Emissions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Indirect emissions from your value chain: purchased materials, transportation,
          waste, and business travel. Mark categories as &quot;Not Applicable&quot; if they
          don&apos;t apply to your operations.
        </p>
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
          <p className="text-xs text-blue-800">
            Spend-based entries are automatically flagged as &quot;Estimated&quot; quality.
            Where possible, use quantity-based data for better accuracy.
          </p>
        </div>
      </div>

      {/* Collapsible sections per category */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-xs text-gray-400">Loading source options...</p>
        </div>
      )}
      {SCOPE3_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.value}
          category={cat.value}
          label={cat.label}
          entries={scope3Data.filter((e) => e.sourceCategory === cat.value)}
          sourceOptions={optionsByCategory[cat.value] ?? []}
          facilities={facilities}
          onAdd={() => handleAdd(cat.value)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          notApplicable={naCategories.has(cat.value)}
          onToggleNA={() => toggleNA(cat.value)}
        />
      ))}
    </div>
  );
}
