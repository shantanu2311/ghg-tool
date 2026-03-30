'use client';

import { useEffect } from 'react';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  INDIAN_STATES,
  STATE_GRID_MAP,
  IRON_STEEL_SUB_SECTORS,
} from '@/lib/calc-engine/constants';

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

const selectClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

function FacilityCard({
  facility,
  index,
  canRemove,
}: {
  facility: { id: string; name: string; address: string; state: string; district: string; gridRegion: string; activityType: string };
  index: number;
  canRemove: boolean;
}) {
  const updateFacility = useWizardStore((s) => s.updateFacility);
  const removeFacility = useWizardStore((s) => s.removeFacility);

  function handleStateChange(state: string) {
    const gridRegion = STATE_GRID_MAP[state] ?? '';
    updateFacility(facility.id, { state, gridRegion });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Facility {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => removeFacility(facility.id)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Facility Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Main Plant"
            value={facility.name}
            onChange={(e) => updateFacility(facility.id, { name: e.target.value })}
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Street address"
            value={facility.address}
            onChange={(e) => updateFacility(facility.id, { address: e.target.value })}
          />
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <select
            className={selectClass}
            value={facility.state}
            onChange={(e) => handleStateChange(e.target.value)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">District</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Ahmedabad"
            value={facility.district}
            onChange={(e) => updateFacility(facility.id, { district: e.target.value })}
          />
        </div>

        {/* Grid Region (auto-filled, read-only) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Grid Region</label>
          <input
            type="text"
            className={cn(inputClass, 'bg-gray-50 text-gray-500')}
            value={facility.gridRegion || '(auto-filled from state)'}
            readOnly
          />
        </div>

        {/* Activity Type */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Activity Type</label>
          <select
            className={selectClass}
            value={facility.activityType}
            onChange={(e) => updateFacility(facility.id, { activityType: e.target.value })}
          >
            <option value="">Select type</option>
            {IRON_STEEL_SUB_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function StepFacilities() {
  const facilities = useWizardStore((s) => s.facilities);
  const orgState = useWizardStore((s) => s.organisation.state);
  const orgSubSector = useWizardStore((s) => s.organisation.subSector);
  const addFacility = useWizardStore((s) => s.addFacility);

  // Auto-create first facility if none exist
  useEffect(() => {
    if (facilities.length === 0) {
      const gridRegion = orgState ? (STATE_GRID_MAP[orgState] ?? '') : '';
      addFacility({
        name: '',
        address: '',
        state: orgState,
        district: '',
        gridRegion,
        activityType: orgSubSector,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddFacility() {
    addFacility({
      name: '',
      address: '',
      state: '',
      district: '',
      gridRegion: '',
      activityType: '',
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Facility Setup</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add the facilities where your company operates. Most MSMEs have a single facility.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFacility}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            + Add Facility
          </button>
        </div>
      </div>

      {facilities.map((facility, i) => (
        <FacilityCard
          key={facility.id}
          facility={facility}
          index={i}
          canRemove={facilities.length > 1}
        />
      ))}

      {facilities.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">No facilities added yet.</p>
        </div>
      )}
    </div>
  );
}
