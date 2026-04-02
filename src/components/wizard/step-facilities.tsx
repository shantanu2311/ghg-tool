'use client';

import { useEffect } from 'react';
import { useWizardStore } from '@/lib/store';
import {
  INDIAN_STATES,
  STATE_GRID_MAP,
  IRON_STEEL_SUB_SECTORS,
} from '@/lib/calc-engine/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Plus, Trash2, Building2, Inbox } from 'lucide-react';
import { FieldHelpButton } from '@/components/ai/field-help-button';
import { InfoTip } from '@/components/ui/info-tip';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          <Building2 className="inline h-4 w-4 mr-1.5 text-muted-foreground" />
          Facility {index + 1}
        </CardTitle>
        {canRemove && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFacility(facility.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor={`fac-name-${facility.id}`}>
              Facility Name <span className="text-destructive">*</span> <InfoTip text="A physical location where your company operates — factory, plant, or office." />
            </Label>
            <Input
              id={`fac-name-${facility.id}`}
              placeholder="e.g. Main Plant"
              value={facility.name}
              onChange={(e) => updateFacility(facility.id, { name: e.target.value })}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor={`fac-addr-${facility.id}`}>Address <InfoTip text="Optional. Street address for record-keeping and audit trail." /></Label>
            <Input
              id={`fac-addr-${facility.id}`}
              placeholder="Street address"
              value={facility.address}
              onChange={(e) => updateFacility(facility.id, { address: e.target.value })}
            />
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <Label>
              State <span className="text-destructive">*</span> <InfoTip text="Determines the electricity grid region, which affects your Scope 2 emission factor." />
            </Label>
            <Select
              value={facility.state }
              onValueChange={(val) => handleStateChange(val ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <Label htmlFor={`fac-dist-${facility.id}`}>District <InfoTip text="Optional. Helps with cluster-specific benchmarking." /></Label>
            <Input
              id={`fac-dist-${facility.id}`}
              placeholder="e.g. Ahmedabad"
              value={facility.district}
              onChange={(e) => updateFacility(facility.id, { district: e.target.value })}
            />
          </div>

          {/* Grid Region (auto-filled, read-only) */}
          <div className="space-y-1.5">
            <Label>Grid Region <InfoTip text="Auto-assigned based on state. India has 5 grid regions with different emission factors (CEA v21.0)." /></Label>
            <Input
              value={facility.gridRegion || '(auto-filled from state)'}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>

          {/* Activity Type */}
          <div className="space-y-1.5">
            <Label>Activity Type <InfoTip text="Optional. Primary manufacturing activity at this facility. Used for sub-sector benchmarking." /></Label>
            <Select
              value={facility.activityType }
              onValueChange={(val) => updateFacility(facility.id, { activityType: val ?? '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {IRON_STEEL_SUB_SECTORS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
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
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Facility Setup</CardTitle>
              <FieldHelpButton step="facilities" />
            </div>
            <CardDescription>
              Add the facilities where your company operates. Most MSMEs have a single facility.
            </CardDescription>
          </div>
          <CardAction>
            <Button onClick={handleAddFacility} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Facility
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {facilities.map((facility, i) => (
        <FacilityCard
          key={facility.id}
          facility={facility}
          index={i}
          canRemove={facilities.length > 1}
        />
      ))}

      {facilities.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No facilities added yet.</p>
            <Button onClick={handleAddFacility} variant="outline" size="sm" className="mt-3 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Your First Facility
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
