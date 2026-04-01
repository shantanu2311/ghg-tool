'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';

interface Props {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const SCOPE_OPTIONS = [
  { value: 1, label: 'Scope 1 — Direct emissions' },
  { value: 2, label: 'Scope 2 — Purchased energy' },
  { value: 3, label: 'Scope 3 — Value chain' },
] as const;

const CATEGORY_OPTIONS = [
  { value: 'stationary_combustion', label: 'Stationary Combustion' },
  { value: 'mobile_combustion', label: 'Mobile Combustion' },
  { value: 'process', label: 'Process Emissions' },
  { value: 'fugitive', label: 'Fugitive Emissions' },
  { value: 'purchased_electricity', label: 'Purchased Electricity' },
  { value: 'purchased_heat', label: 'Purchased Heat/Steam' },
  { value: 'transport_distribution', label: 'Transport & Distribution' },
  { value: 'waste', label: 'Waste' },
  { value: 'custom', label: 'Custom / Other' },
] as const;

const UNIT_OPTIONS = [
  { value: 'tonne', label: 'Tonne' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'litre', label: 'Litre' },
  { value: 'kWh', label: 'kWh' },
  { value: 'm3', label: 'Cubic metre (m\u00B3)' },
] as const;

interface FormData {
  name: string;
  description: string;
  scope: number;
  sourceCategory: string;
  baseUnit: string;
  density: string;
  ncvTjPerGg: string;
  co2EfKgPerUnit: string;
  ch4EfKgPerUnit: string;
  n2oEfKgPerUnit: string;
  efSource: string;
  efSourceUrl: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  description: '',
  scope: 1,
  sourceCategory: 'stationary_combustion',
  baseUnit: 'tonne',
  density: '',
  ncvTjPerGg: '',
  co2EfKgPerUnit: '',
  ch4EfKgPerUnit: '',
  n2oEfKgPerUnit: '',
  efSource: '',
  efSourceUrl: '',
};

export function CustomSourceDialog({ orgId, open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setStep(1);
    setForm({ ...INITIAL_FORM });
    setError('');
    setSaving(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function canAdvance(): boolean {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) return form.baseUnit.length > 0;
    if (step === 3) return form.co2EfKgPerUnit.trim().length > 0 && form.efSource.trim().length > 0;
    return true;
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/custom-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          scope: form.scope,
          sourceCategory: form.sourceCategory,
          baseUnit: form.baseUnit,
          density: form.density ? parseFloat(form.density) : null,
          ncvTjPerGg: form.ncvTjPerGg ? parseFloat(form.ncvTjPerGg) : null,
          co2EfKgPerUnit: parseFloat(form.co2EfKgPerUnit),
          ch4EfKgPerUnit: form.ch4EfKgPerUnit ? parseFloat(form.ch4EfKgPerUnit) : null,
          n2oEfKgPerUnit: form.n2oEfKgPerUnit ? parseFloat(form.n2oEfKgPerUnit) : null,
          efSource: form.efSource.trim(),
          efSourceUrl: form.efSourceUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      onCreated();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom source');
    } finally {
      setSaving(false);
    }
  }

  const stepTitles = ['What is it?', 'How is it measured?', 'Emission factor', 'Review & save'];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Source</DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {stepTitles[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-6 bg-primary' : s < step ? 'w-3 bg-primary/40' : 'w-3 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4 py-2">
          {/* ── Step 1: What is it? ─────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Source name *</Label>
                <Input
                  placeholder="e.g. Pet Coke, Rice Husk Briquettes"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <textarea
                  className="flex h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none dark:bg-input/30"
                  placeholder="Optional: what this source is and how it's used"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Scope *</Label>
                <div className="space-y-1.5">
                  {SCOPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${
                        form.scope === opt.value
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={form.scope === opt.value}
                        onChange={() => update('scope', opt.value)}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Category *</Label>
                <Select
                  value={form.sourceCategory}
                  onValueChange={(val) => val && update('sourceCategory', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => CATEGORY_OPTIONS.find((c) => c.value === form.sourceCategory)?.label || 'Select category'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ── Step 2: How is it measured? ──────────── */}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Base unit *</Label>
                <Select
                  value={form.baseUnit}
                  onValueChange={(val) => val && update('baseUnit', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => UNIT_OPTIONS.find((u) => u.value === form.baseUnit)?.label || 'Select unit'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Density (kg/L)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Optional — for liquid fuels"
                  value={form.density}
                  onChange={(e) => update('density', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Required if base unit is litres and EF is per kg</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Net Calorific Value (TJ/Gg)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Optional — for fuel-based EFs"
                  value={form.ncvTjPerGg}
                  onChange={(e) => update('ncvTjPerGg', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">IPCC uses TJ/Gg for tier 2 calculations</p>
              </div>
            </>
          )}

          {/* ── Step 3: Emission factor ─────────────── */}
          {step === 3 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  CO2 emission factor (kg CO2 per {form.baseUnit}) *
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 2.45"
                  value={form.co2EfKgPerUnit}
                  onChange={(e) => update('co2EfKgPerUnit', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CH4 EF (kg/{form.baseUnit})</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={form.ch4EfKgPerUnit}
                    onChange={(e) => update('ch4EfKgPerUnit', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">N2O EF (kg/{form.baseUnit})</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    value={form.n2oEfKgPerUnit}
                    onChange={(e) => update('n2oEfKgPerUnit', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">EF source *</Label>
                <Input
                  placeholder="e.g. IPCC 2006, Supplier datasheet, Energy auditor"
                  value={form.efSource}
                  onChange={(e) => update('efSource', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Source URL</Label>
                <Input
                  type="url"
                  placeholder="Optional — link to source document"
                  value={form.efSourceUrl}
                  onChange={(e) => update('efSourceUrl', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Step 4: Review ──────────────────────── */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
                <Row label="Name" value={form.name} />
                {form.description && <Row label="Description" value={form.description} />}
                <Row label="Scope" value={`Scope ${form.scope}`} />
                <Row label="Category" value={CATEGORY_OPTIONS.find((c) => c.value === form.sourceCategory)?.label || form.sourceCategory} />
                <div className="border-t border-border my-1" />
                <Row label="Base unit" value={UNIT_OPTIONS.find((u) => u.value === form.baseUnit)?.label || form.baseUnit} />
                {form.density && <Row label="Density" value={`${form.density} kg/L`} />}
                {form.ncvTjPerGg && <Row label="NCV" value={`${form.ncvTjPerGg} TJ/Gg`} />}
                <div className="border-t border-border my-1" />
                <Row label="CO2 EF" value={`${form.co2EfKgPerUnit} kg/${form.baseUnit}`} />
                {form.ch4EfKgPerUnit && <Row label="CH4 EF" value={`${form.ch4EfKgPerUnit} kg/${form.baseUnit}`} />}
                {form.n2oEfKgPerUnit && <Row label="N2O EF" value={`${form.n2oEfKgPerUnit} kg/${form.baseUnit}`} />}
                <Row label="Source" value={form.efSource} />
                {form.efSourceUrl && <Row label="URL" value={form.efSourceUrl} />}
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              <ChevronLeft className="size-4" data-icon="inline-start" />
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Next
              <ChevronRight className="size-4" data-icon="inline-end" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Check className="size-4" data-icon="inline-start" />
              )}
              {saving ? 'Saving...' : 'Save source'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <span className="text-right font-medium truncate">{value}</span>
    </div>
  );
}
