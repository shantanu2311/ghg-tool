'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { IRON_STEEL_SUB_SECTORS, INDIAN_STATES, TURNOVER_BRACKETS } from '@/lib/calc-engine/constants';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

const selectClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

export default function StepOrganisation() {
  const org = useWizardStore((s) => s.organisation);
  const update = useWizardStore((s) => s.updateOrganisation);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Organisation Profile</h2>
      <p className="mt-1 text-sm text-gray-500">
        Basic details about your company. This information will appear on the final report.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Company Name */}
        <Field label="Company Name" required>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Ramesh Steel Industries"
            value={org.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>

        {/* UDYAM Number */}
        <Field label="UDYAM Number">
          <input
            type="text"
            className={inputClass}
            placeholder="UDYAM-XX-00-0000000"
            value={org.udyamNumber}
            onChange={(e) => update({ udyamNumber: e.target.value })}
          />
        </Field>

        {/* Sector (read-only) */}
        <Field label="Sector">
          <input
            type="text"
            className={cn(inputClass, 'bg-gray-50 text-gray-500')}
            value="Iron & Steel"
            readOnly
          />
        </Field>

        {/* Sub-sector */}
        <Field label="Sub-sector" required>
          <select
            className={selectClass}
            value={org.subSector}
            onChange={(e) => update({ subSector: e.target.value })}
          >
            <option value="">Select sub-sector</option>
            {IRON_STEEL_SUB_SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        {/* State */}
        <Field label="State" required>
          <select
            className={selectClass}
            value={org.state}
            onChange={(e) => update({ state: e.target.value })}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </Field>

        {/* District */}
        <Field label="District">
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. Ahmedabad"
            value={org.district}
            onChange={(e) => update({ district: e.target.value })}
          />
        </Field>

        {/* Employee Count */}
        <Field label="Employee Count">
          <input
            type="number"
            className={inputClass}
            placeholder="e.g. 150"
            min={0}
            value={org.employeeCount ?? ''}
            onChange={(e) =>
              update({
                employeeCount: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>

        {/* Turnover Bracket */}
        <Field label="Turnover Bracket">
          <select
            className={selectClass}
            value={org.turnoverBracket}
            onChange={(e) => update({ turnoverBracket: e.target.value })}
          >
            <option value="">Select bracket</option>
            {TURNOVER_BRACKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Contact Email */}
        <Field label="Contact Email">
          <input
            type="email"
            className={inputClass}
            placeholder="contact@company.com"
            value={org.contactEmail}
            onChange={(e) => update({ contactEmail: e.target.value })}
          />
        </Field>

        {/* Contact Phone */}
        <Field label="Contact Phone">
          <input
            type="tel"
            className={inputClass}
            placeholder="+91 98765 43210"
            value={org.contactPhone}
            onChange={(e) => update({ contactPhone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
