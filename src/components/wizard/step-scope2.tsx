'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SCOPE2_CATEGORIES } from '@/lib/calc-engine/constants';
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
  fuelOptions,
  onUpdate,
  onRemove,
  facilities,
}: {
  entry: ActivityEntry;
  fuelOptions: FuelOption[];
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  facilities: { id: string; name: string; gridRegion: string }[];
}) {
  const selectedFuel = fuelOptions.find((f) => f.value === entry.fuelType);
  const defaultUnit = selectedFuel?.unit ?? '';
  const selectedFacility = facilities.find((f) => f.id === entry.facilityId);

  function handleFuelChange(fuelType: string) {
    const fuel = fuelOptions.find((f) => f.value === fuelType);
    onUpdate(entry.id, { fuelType, unit: fuel?.unit ?? '' });
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
          {selectedFacility?.gridRegion && (
            <p className="text-[11px] text-gray-400">
              Grid region: {selectedFacility.gridRegion}
            </p>
          )}
        </div>

        {/* Source Type */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">Energy Source</label>
          <select
            className={selectClass}
            value={entry.fuelType}
            onChange={(e) => handleFuelChange(e.target.value)}
          >
            <option value="">Select source</option>
            {fuelOptions.map((f) => (
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
            placeholder="e.g. Main meter, Solar panels"
            value={entry.description}
            onChange={(e) => onUpdate(entry.id, { description: e.target.value })}
          />
        </div>
      </div>

      {/* Monthly toggle + Remove */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            checked={entry.month !== null}
            onChange={(e) =>
              onUpdate(entry.id, { month: e.target.checked ? 1 : null })
            }
          />
          Monthly breakdown
        </label>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>

      {entry.month !== null && (
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-medium text-gray-600">Month (1-12)</label>
          <input
            type="number"
            min={1}
            max={12}
            className={cn(inputClass, 'w-24')}
            value={entry.month ?? 1}
            onChange={(e) =>
              onUpdate(entry.id, { month: e.target.value ? Number(e.target.value) : 1 })
            }
          />
          <p className="text-[11px] text-gray-400">
            Add separate entries for each month if using monthly breakdown.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  label,
  entries,
  fuelOptions,
  facilities,
  onAdd,
  onUpdate,
  onRemove,
}: {
  category: string;
  label: string;
  entries: ActivityEntry[];
  fuelOptions: FuelOption[];
  facilities: { id: string; name: string; gridRegion: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {category === 'grid_electricity' && 'Electricity purchased from the grid and captive renewable generation'}
            {category === 'purchased_steam' && 'Steam or heat purchased from external suppliers'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          + Add Entry
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              fuelOptions={fuelOptions}
              onUpdate={onUpdate}
              onRemove={onRemove}
              facilities={facilities}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center">
          <p className="text-xs text-gray-400">No entries yet. Click &quot;+ Add Entry&quot; to start.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepScope2() {
  const facilities = useWizardStore((s) => s.facilities);
  const scope2Data = useWizardStore((s) => s.scope2Data);
  const addActivity = useWizardStore((s) => s.addActivity);
  const updateActivity = useWizardStore((s) => s.updateActivity);
  const removeActivity = useWizardStore((s) => s.removeActivity);
  const { optionsByCategory, loading } = useFuelOptions(2);

  function handleAdd(category: string) {
    const defaultFacilityId = facilities.length > 0 ? facilities[0].id : '';
    addActivity(2, {
      facilityId: defaultFacilityId,
      sourceCategory: category,
      fuelType: '',
      description: '',
      inputMode: 'quantity',
      quantity: null,
      unit: '',
      spendInr: null,
      dataQualityFlag: 'PRIMARY',
      month: null,
    });
  }

  function handleUpdate(id: string, data: Partial<Omit<ActivityEntry, 'id'>>) {
    updateActivity(2, id, data);
  }

  function handleRemove(id: string) {
    removeActivity(2, id);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Scope 2 — Purchased Energy</h2>
        <p className="mt-1 text-sm text-gray-500">
          Emissions from purchased electricity, steam, or heat consumed by your facilities.
          The grid emission factor is determined by your facility&apos;s state (CEA regional grid).
        </p>
        {facilities.length === 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
            <p className="text-xs text-amber-800">
              No facilities added. Please go back to Step 2 and add at least one facility.
            </p>
          </div>
        )}
      </div>

      {/* One section per category */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-xs text-gray-400">Loading energy source options...</p>
        </div>
      )}
      {SCOPE2_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.value}
          category={cat.value}
          label={cat.label}
          entries={scope2Data.filter((e) => e.sourceCategory === cat.value)}
          fuelOptions={optionsByCategory[cat.value] ?? []}
          facilities={facilities}
          onAdd={() => handleAdd(cat.value)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
