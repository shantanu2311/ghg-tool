'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SCOPE1_CATEGORIES } from '@/lib/calc-engine/constants';
import { useFuelOptions } from '@/lib/hooks/use-fuel-options';
import type { ActivityEntry } from '@/lib/store';
import type { FuelOption } from '@/lib/hooks/use-fuel-options';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Inbox, AlertTriangle } from 'lucide-react';
import { FieldHelpButton } from '@/components/ai/field-help-button';
import { InfoTip } from '@/components/ui/info-tip';
import { DataQualityToggle } from './data-quality-toggle';

// ── Entry Row Component ──────────────────────────────────────────────────────

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
  facilities: { id: string; name: string }[];
}) {
  const selectedFuel = fuelOptions.find((f) => f.value === entry.fuelType);
  const defaultUnit = selectedFuel?.unit ?? '';

  function handleFuelChange(fuelType: string) {
    const fuel = fuelOptions.find((f) => f.value === fuelType);
    onUpdate(entry.id, { fuelType, unit: fuel?.unit ?? '' });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Facility */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Facility <InfoTip text="Which factory/plant this activity belongs to." /></Label>
          <Select
            value={entry.facilityId }
            onValueChange={(val) => onUpdate(entry.id, { facilityId: val ?? '' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select facility">
                {() => {
                  const f = facilities.find((fac) => fac.id === entry.facilityId);
                  return f?.name || 'Select facility';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name || 'Unnamed Facility'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fuel Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Source / Fuel Type <InfoTip text="The specific fuel or activity. Emission factors are automatically applied based on your selection." /></Label>
          <Select
            value={entry.fuelType }
            onValueChange={(val) => handleFuelChange(val ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type">
                {() => {
                  const f = fuelOptions.find((fo) => fo.value === entry.fuelType);
                  return f?.label || 'Select type';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {fuelOptions.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input Mode Toggle */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Input Mode <InfoTip text="Quantity mode uses direct measurement (preferred). Spend mode converts INR to quantity via fuel prices — flagged as Estimated quality." /></Label>
          <Tabs
            value={entry.inputMode}
            onValueChange={(val) => {
              const updates: Partial<Omit<ActivityEntry, 'id'>> = { inputMode: val as 'quantity' | 'spend' };
              if (val === 'spend') updates.dataQualityFlag = 'ESTIMATED';
              onUpdate(entry.id, updates);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="quantity" className="flex-1 text-xs">Quantity</TabsTrigger>
              <TabsTrigger value="spend" className="flex-1 text-xs">Spend (INR)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Quantity or Spend */}
        {entry.inputMode === 'quantity' ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Quantity ({defaultUnit || 'unit'}) <InfoTip text="Amount consumed. Check purchase invoices, weigh-bridge slips, or meter readings." />
            </Label>
            <Input
              type="number"
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
            <Label className="text-xs text-muted-foreground">Spend (INR) <InfoTip text="Total expenditure in INR. Will be converted to quantity using average fuel prices." /></Label>
            <Input
              type="number"
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
          <Label className="text-xs text-muted-foreground">Data Quality <InfoTip text="Primary = metered/weighed. Secondary = from invoices/supplier data. Estimated = calculated from spend or averages." /></Label>
          <DataQualityToggle
            value={entry.dataQualityFlag as 'PRIMARY' | 'SECONDARY' | 'ESTIMATED'}
            onChange={(v) => onUpdate(entry.id, { dataQualityFlag: v })}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Description (optional) <InfoTip text="Optional. E.g. equipment name, DG set ID, vehicle number." /></Label>
          <Input
            placeholder="e.g. DG set, Boiler"
            value={entry.description}
            onChange={(e) => onUpdate(entry.id, { description: e.target.value })}
          />
        </div>
      </div>

      {/* Monthly toggle + Remove */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch
            size="sm"
            checked={entry.month !== null}
            onCheckedChange={(checked) =>
              onUpdate(entry.id, { month: checked ? 1 : null })
            }
          />
          Monthly breakdown <InfoTip text="Enable to record consumption month by month for seasonal analysis." />
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(entry.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Remove
        </Button>
      </div>

      {/* Monthly inputs */}
      {entry.month !== null && (
        <div className="space-y-1 pt-1">
          <Label className="text-xs text-muted-foreground">Month (1-12)</Label>
          <Input
            type="number"
            min={1}
            max={12}
            className="w-24"
            value={entry.month ?? 1}
            onChange={(e) =>
              onUpdate(entry.id, { month: e.target.value ? Number(e.target.value) : 1 })
            }
          />
          <p className="text-[11px] text-muted-foreground/70">
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
  facilities: { id: string; name: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {category === 'stationary_combustion' && 'Boilers, furnaces, DG sets, heaters'}
            {category === 'mobile_combustion' && 'Company-owned vehicles and mobile equipment'}
            {category === 'process' && 'Emissions from chemical/physical transformation of materials'}
            {category === 'fugitive' && 'Refrigerant leaks and gas losses'}
          </CardDescription>
        </div>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5 text-xs">
            <Plus className="h-3 w-3" />
            Add Entry
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No entries yet</p>
            <Button variant="ghost" size="sm" onClick={onAdd} className="mt-2 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add Entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepScope1() {
  const facilities = useWizardStore((s) => s.facilities);
  const scope1Data = useWizardStore((s) => s.scope1Data);
  const addActivity = useWizardStore((s) => s.addActivity);
  const updateActivity = useWizardStore((s) => s.updateActivity);
  const removeActivity = useWizardStore((s) => s.removeActivity);
  const { optionsByCategory, loading } = useFuelOptions(1);

  function handleAdd(category: string) {
    const defaultFacilityId = facilities.length > 0 ? facilities[0].id : '';
    addActivity(1, {
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
    updateActivity(1, id, data);
  }

  function handleRemove(id: string) {
    removeActivity(1, id);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Scope 1 -- Direct Emissions</CardTitle>
            <FieldHelpButton step="scope1" scope={1} />
          </div>
          <CardDescription>
            Emissions from sources owned or controlled by your company: fuel combustion in boilers,
            furnaces, vehicles; process emissions from steelmaking; and fugitive refrigerant leaks.
          </CardDescription>
        </CardHeader>
        {facilities.length === 0 && (
          <CardContent>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                No facilities added. Please go back to Step 2 and add at least one facility.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* One section per category */}
      {SCOPE1_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.value}
          category={cat.value}
          label={cat.label}
          entries={scope1Data.filter((e) => e.sourceCategory === cat.value)}
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
