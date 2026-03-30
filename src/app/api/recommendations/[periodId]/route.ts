import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRecommendations } from '@/lib/rec-engine/index';
import type { TechnologyData, FundingData, TechFundingLinkData, RecommendationInput } from '@/lib/rec-engine/types';
import type { ActivityDataInput, CalculationRecord, ScopeTotal } from '@/lib/calc-engine/types';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params;

    // 1. Fetch period + organisation
    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: { organisation: true },
    });
    if (!period) {
      return NextResponse.json({ error: 'Reporting period not found' }, { status: 404 });
    }
    if (period.status === 'draft') {
      return NextResponse.json(
        { error: 'Calculation not yet run. Please calculate emissions first.' },
        { status: 400 }
      );
    }

    // 2. Fetch calculated emissions with activity data + facilities
    const calcRecords = await prisma.calculatedEmission.findMany({
      where: { periodId },
      include: {
        activityData: { include: { facility: true } },
        emissionFactor: true,
      },
    });

    if (calcRecords.length === 0) {
      return NextResponse.json(
        { error: 'No calculated emissions found. Run calculation first.' },
        { status: 400 }
      );
    }

    // 3. Build InventoryResult-like structure from DB records
    let scope1Total = 0, scope2Total = 0, scope3Total = 0;
    const scope1Cats = new Map<string, number>();
    const scope2Cats = new Map<string, number>();
    const scope3Cats = new Map<string, number>();

    const activityData: ActivityDataInput[] = [];
    const calculations: CalculationRecord[] = [];
    const facilityStates = new Set<string>();

    for (const cr of calcRecords) {
      const ad = cr.activityData;
      facilityStates.add(ad.facility.state);

      activityData.push({
        id: ad.id,
        facilityId: ad.facilityId,
        scope: ad.scope as 1 | 2 | 3,
        sourceCategory: ad.sourceCategory,
        fuelType: ad.fuelType,
        description: ad.description ?? undefined,
        inputMode: ad.inputMode as 'quantity' | 'spend',
        quantity: ad.quantity ?? undefined,
        unit: ad.unit ?? undefined,
        spendInr: ad.spendInr ?? undefined,
        dataQualityFlag: ad.dataQualityFlag as 'PRIMARY' | 'SECONDARY' | 'ESTIMATED',
        month: ad.month ?? undefined,
      });

      calculations.push({
        activityDataId: ad.id,
        efId: cr.efId,
        efSource: cr.emissionFactor.source,
        efVersion: cr.emissionFactor.sourceVersion,
        gwpReport: 'AR5',
        co2Tonnes: cr.co2Tonnes,
        ch4Co2eTonnes: cr.ch4Co2eTonnes,
        n2oCo2eTonnes: cr.n2oCo2eTonnes,
        totalCo2eTonnes: cr.totalCo2eTonnes,
        biogenicCo2Tonnes: 0,
        calculationSteps: cr.calculationSteps ? JSON.parse(cr.calculationSteps) : [],
      });

      if (ad.scope === 1) {
        scope1Total += cr.totalCo2eTonnes;
        scope1Cats.set(ad.sourceCategory, (scope1Cats.get(ad.sourceCategory) ?? 0) + cr.totalCo2eTonnes);
      } else if (ad.scope === 2) {
        scope2Total += cr.totalCo2eTonnes;
        scope2Cats.set(ad.sourceCategory, (scope2Cats.get(ad.sourceCategory) ?? 0) + cr.totalCo2eTonnes);
      } else {
        scope3Total += cr.totalCo2eTonnes;
        scope3Cats.set(ad.sourceCategory, (scope3Cats.get(ad.sourceCategory) ?? 0) + cr.totalCo2eTonnes);
      }
    }

    const toScopeTotal = (scope: 1 | 2 | 3, total: number, cats: Map<string, number>): ScopeTotal => ({
      scope,
      total,
      categories: Array.from(cats.entries()).map(([category, catTotal]) => ({ category, total: catTotal })),
    });

    const grandTotal = scope1Total + scope2Total + scope3Total;

    // 4. Fetch all technologies, funding schemes, and links in parallel
    const [allTechsRaw, allFundingRaw, allLinksRaw] = await Promise.all([
      prisma.reductionTechnology.findMany(),
      prisma.fundingScheme.findMany(),
      prisma.techFundingLink.findMany(),
    ]);

    const allTechnologies: TechnologyData[] = allTechsRaw.map((t) => ({
      id: t.id,
      techId: t.techId,
      name: t.name,
      category: t.category,
      applicableSectors: parseJson(t.applicableSectors) ?? [],
      scopeAddressed: t.scopeAddressed,
      energyTypeSaved: t.energyTypeSaved,
      description: t.description,
      energySavingMinPct: t.energySavingMinPct,
      energySavingMaxPct: t.energySavingMaxPct,
      co2ReductionMinPct: t.co2ReductionMinPct,
      co2ReductionMaxPct: t.co2ReductionMaxPct,
      paybackMinYears: t.paybackMinYears,
      paybackMaxYears: t.paybackMaxYears,
      capexMinLakhs: t.capexMinLakhs,
      capexMaxLakhs: t.capexMaxLakhs,
      technologyReadiness: t.technologyReadiness,
      demonstratedInIndia: t.demonstratedInIndia,
      indianClusters: parseJson(t.indianClusters),
      matchesFuelTypes: parseJson(t.matchesFuelTypes),
      matchesCategories: parseJson(t.matchesCategories),
      matchesSubSectors: parseJson(t.matchesSubSectors),
      minEmissionThreshold: t.minEmissionThreshold,
      source: t.source,
      sourceUrl: t.sourceUrl,
    }));

    const allFunding: FundingData[] = allFundingRaw.map((f) => ({
      id: f.id,
      schemeId: f.schemeId,
      name: f.name,
      implementingAgency: f.implementingAgency,
      targetBeneficiary: f.targetBeneficiary,
      supportType: f.supportType,
      financialDetails: f.financialDetails,
      sectorsCovered: parseJson(f.sectorsCovered) ?? [],
      eligibilityCriteria: f.eligibilityCriteria,
      requiredDocuments: parseJson(f.requiredDocuments),
      minEnergySaving: f.minEnergySaving,
      turnoverBrackets: parseJson(f.turnoverBrackets),
      applicableStates: parseJson(f.applicableStates),
      status: f.status,
      validFrom: f.validFrom?.toISOString() ?? null,
      validTo: f.validTo?.toISOString() ?? null,
      applicationUrl: f.applicationUrl,
      reportedImpact: f.reportedImpact,
      source: f.source,
      sourceUrl: f.sourceUrl,
    }));

    const allLinks: TechFundingLinkData[] = allLinksRaw.map((l) => ({
      techId: l.techId,
      fundingId: l.fundingId,
      subsidyPct: l.subsidyPct,
      maxAmountLakhs: l.maxAmountLakhs,
      notes: l.notes,
    }));

    // 5. Run recommendation engine
    const input: RecommendationInput = {
      inventoryResult: {
        organisationId: period.orgId,
        periodId,
        scope1: toScopeTotal(1, scope1Total, scope1Cats),
        scope2Location: toScopeTotal(2, scope2Total, scope2Cats),
        scope2Market: null,
        scope3: toScopeTotal(3, scope3Total, scope3Cats),
        grandTotal,
        biogenicCo2Total: 0,
        energyConsumedGj: 0,
        renewablePercent: 0,
        intensityMetrics: { perTurnover: null, perProduct: null, perEmployee: null },
        dataQuality: { overall: 0, grade: 'Fair', breakdown: { primary: 0, secondary: 0, estimated: 0, total: 0 }, recommendations: [] },
        crossCheckWarnings: [],
        calculations,
        topSources: [],
        facilityBreakdown: [],
        monthlyTrend: null,
        calculationErrors: [],
      },
      activityData,
      calculations,
      organisation: {
        sector: period.organisation.sector,
        subSector: period.organisation.subSector,
        state: period.organisation.state,
        turnoverBracket: period.organisation.turnoverBracket ?? undefined,
      },
      facilityStates: Array.from(facilityStates),
      allTechnologies,
      allFunding,
      allLinks,
    };

    const result = generateRecommendations(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/recommendations/[periodId] error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
