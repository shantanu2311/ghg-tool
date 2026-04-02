'use client';

import { useWizardStore } from '@/lib/store';
import { IRON_STEEL_SUB_SECTORS, INDIAN_STATES, TURNOVER_BRACKETS } from '@/lib/calc-engine/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Building2, Mail, Phone, MapPin, Users, Landmark } from 'lucide-react';
import { FieldHelpButton } from '@/components/ai/field-help-button';
import { InfoTip } from '@/components/ui/info-tip';

export default function StepOrganisation() {
  const org = useWizardStore((s) => s.organisation);
  const update = useWizardStore((s) => s.updateOrganisation);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Organisation Profile</CardTitle>
          <FieldHelpButton step="organisation" />
        </div>
        <CardDescription>
          Basic details about your company. This information will appear on the final report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="org-name">
              Company Name <span className="text-destructive">*</span>
              <InfoTip text="Legal entity name as registered. This will appear on your GHG inventory report." />
            </Label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="org-name"
                className="pl-8"
                placeholder="e.g. Ramesh Steel Industries"
                value={org.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
          </div>

          {/* UDYAM Number */}
          <div className="space-y-1.5">
            <Label htmlFor="org-udyam">UDYAM Number <InfoTip text="MSME registration number (format: UDYAM-XX-00-0000000). Optional, but helps with government scheme eligibility." /></Label>
            <Input
              id="org-udyam"
              placeholder="UDYAM-XX-00-0000000"
              value={org.udyamNumber}
              onChange={(e) => update({ udyamNumber: e.target.value })}
            />
          </div>

          {/* Sector (read-only) */}
          <div className="space-y-1.5">
            <Label>Sector <InfoTip text="Currently limited to Iron & Steel. More sectors coming soon." /></Label>
            <Input
              value="Iron & Steel"
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>

          {/* Sub-sector */}
          <div className="space-y-1.5">
            <Label>
              Sub-sector <span className="text-destructive">*</span>
              <InfoTip text="Your primary manufacturing process. Determines which emission sources and benchmarks are relevant." />
            </Label>
            <Select
              value={org.subSector}
              onValueChange={(val) => update({ subSector: val ?? '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sub-sector" />
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

          {/* State */}
          <div className="space-y-1.5">
            <Label>
              <MapPin className="h-3.5 w-3.5" />
              State <span className="text-destructive">*</span>
              <InfoTip text="Head office state. Each facility's state determines its electricity grid region for Scope 2 calculations." />
            </Label>
            <Select
              value={org.state}
              onValueChange={(val) => update({ state: val ?? '' })}
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
            <Label htmlFor="org-district">District <InfoTip text="Optional. Helps identify your location for cluster-specific recommendations." /></Label>
            <Input
              id="org-district"
              placeholder="e.g. Ahmedabad"
              value={org.district}
              onChange={(e) => update({ district: e.target.value })}
            />
          </div>

          {/* Employee Count */}
          <div className="space-y-1.5">
            <Label htmlFor="org-employees">
              <Users className="h-3.5 w-3.5" />
              Employee Count
              <InfoTip text="Optional. Used for per-employee intensity metrics if provided." />
            </Label>
            <Input
              id="org-employees"
              type="number"
              placeholder="e.g. 150"
              min={0}
              value={org.employeeCount ?? ''}
              onChange={(e) =>
                update({
                  employeeCount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          {/* Turnover Bracket */}
          <div className="space-y-1.5">
            <Label>
              <Landmark className="h-3.5 w-3.5" />
              Turnover Bracket
              <InfoTip text="MSME classification as per MSMED Act. Determines eligibility for government funding schemes." />
            </Label>
            <Select
              value={org.turnoverBracket}
              onValueChange={(val) => update({ turnoverBracket: val ?? '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select bracket" />
              </SelectTrigger>
              <SelectContent>
                {TURNOVER_BRACKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <Label htmlFor="org-email">
              <Mail className="h-3.5 w-3.5" />
              Contact Email
              <InfoTip text="Optional. Appears on your GHG inventory report for verification purposes." />
            </Label>
            <Input
              id="org-email"
              type="email"
              placeholder="contact@company.com"
              value={org.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="org-phone">
              <Phone className="h-3.5 w-3.5" />
              Contact Phone
              <InfoTip text="Optional. Appears on your GHG inventory report." />
            </Label>
            <Input
              id="org-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={org.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
