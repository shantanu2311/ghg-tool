import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine';
import { decryptActivityData, decryptEmissionData, encryptReportData } from '@/lib/analysis-crypto';
import type { ScopeTotal, IntensityMetrics } from '@/lib/calc-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const { periodId } = await params;

    // Parse request body
    const body: {
      format: 'BRSR' | 'ISO' | 'DETAILED';
      productionTonnes?: number;
      annualTurnoverLakhInr?: number;
    } = await request.json();

    if (!body.format || !['BRSR', 'ISO', 'DETAILED'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid or missing format. Must be BRSR, ISO, or DETAILED.' },
        { status: 400 }
      );
    }

    // 1. Fetch period with organisation
    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: { organisation: true },
    });
    if (!period || period.organisation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Fetch calculated emissions for this period (include activityData)
    const calculatedEmissions = await prisma.calculatedEmission.findMany({
      where: { periodId },
      include: { activityData: true },
    });

    // Decrypt emission and activity data
    for (let i = 0; i < calculatedEmissions.length; i++) {
      const decryptedEmission = decryptEmissionData(calculatedEmissions[i] as unknown as Record<string, unknown>);
      const decryptedActivity = decryptActivityData(calculatedEmissions[i].activityData as unknown as Record<string, unknown>);
      Object.assign(calculatedEmissions[i], decryptedEmission);
      Object.assign(calculatedEmissions[i].activityData, decryptedActivity);
    }

    // 3. If no calculated emissions exist, return 400
    if (calculatedEmissions.length === 0) {
      return NextResponse.json(
        { error: 'Run calculations first' },
        { status: 400 }
      );
    }

    // 5. Compute scope totals (group by scope from activityData)
    const scopeMap = new Map<number, { total: number; categories: Map<string, number> }>();
    for (const ce of calculatedEmissions) {
      const scope = ce.activityData.scope;
      if (!scopeMap.has(scope)) {
        scopeMap.set(scope, { total: 0, categories: new Map() });
      }
      const entry = scopeMap.get(scope)!;
      entry.total += ce.totalCo2eTonnes;

      const cat = ce.activityData.sourceCategory;
      entry.categories.set(cat, (entry.categories.get(cat) ?? 0) + ce.totalCo2eTonnes);
    }

    const buildScopeTotal = (scope: number): ScopeTotal => {
      const entry = scopeMap.get(scope);
      if (!entry) {
        return { scope: scope as 1 | 2 | 3, total: 0, categories: [] };
      }
      return {
        scope: scope as 1 | 2 | 3,
        total: entry.total,
        categories: Array.from(entry.categories.entries()).map(([category, total]) => ({
          category,
          total,
        })),
      };
    };

    const scope1 = buildScopeTotal(1);
    const scope2 = buildScopeTotal(2);
    const scope3 = buildScopeTotal(3);
    const grandTotal = scope1.total + scope2.total + scope3.total;

    // Compute energy consumed using fuel NCV values from DB
    const fuelProperties = await prisma.fuelProperty.findMany();
    const fuelMap = new Map(fuelProperties.map((f) => [f.code, f]));

    let energyConsumedGj = 0;
    let renewableGj = 0;
    for (const ce of calculatedEmissions) {
      const ad = ce.activityData;
      const qty = ad.quantity ?? 0;

      if (ad.fuelType === 'GRID_ELECTRICITY' || ad.fuelType === 'SOLAR_ELECTRICITY' || ad.fuelType === 'WIND_ELECTRICITY' || ad.fuelType === 'RENEWABLE_ELECTRICITY') {
        const gj = qty * 0.0036; // kWh → GJ (physical constant)
        energyConsumedGj += gj;
        if (ad.fuelType !== 'GRID_ELECTRICITY') {
          renewableGj += gj;
        }
      } else if (ad.scope === 1 && ['stationary_combustion', 'mobile_combustion'].includes(ad.sourceCategory)) {
        const fuel = fuelMap.get(ad.fuelType);
        if (fuel?.ncvTjPerGg) {
          // NCV is TJ/Gg = TJ per 1000 tonnes
          let tonnes = 0;
          if (fuel.baseUnit === 'tonne') tonnes = qty;
          else if (fuel.baseUnit === 'kL' && fuel.density) tonnes = qty * fuel.density;
          if (tonnes > 0) {
            const energyTj = (tonnes / 1000) * fuel.ncvTjPerGg;
            energyConsumedGj += energyTj * 1000; // TJ → GJ
          }
        }
      }
    }
    const renewablePercent = energyConsumedGj > 0 ? (renewableGj / energyConsumedGj) * 100 : 0;

    // Compute intensity metrics
    const intensityMetrics: IntensityMetrics = {
      perTurnover: body.annualTurnoverLakhInr
        ? grandTotal / body.annualTurnoverLakhInr
        : null,
      perProduct: body.productionTonnes
        ? grandTotal / body.productionTonnes
        : null,
      perEmployee: period.organisation.employeeCount
        ? grandTotal / period.organisation.employeeCount
        : null,
    };

    // Compute data quality score
    let primaryCount = 0;
    let secondaryCount = 0;
    let estimatedCount = 0;
    for (const ce of calculatedEmissions) {
      const flag = ce.activityData.dataQualityFlag;
      if (flag === 'PRIMARY') primaryCount++;
      else if (flag === 'SECONDARY') secondaryCount++;
      else estimatedCount++;
    }
    const total = calculatedEmissions.length;
    const dataQualityScore = total > 0
      ? ((primaryCount * 100 + secondaryCount * 70 + estimatedCount * 30) / total)
      : 0;

    // 6. For BRSR format: call mapToBrsr and generateMethodologyNote
    let brsrOutput = null;
    let methodologyNote = null;
    if (body.format === 'BRSR') {
      // Sum biogenic CO2 from biomass entries
      const biogenicCo2Total = calculatedEmissions
        .filter((ce) => ce.activityData.fuelType.startsWith('BIOMASS'))
        .reduce((sum, ce) => sum + ce.co2Tonnes, 0);

      brsrOutput = mapToBrsr({
        scope1,
        scope2,
        scope3,
        biogenicCo2Total,
        energyConsumedGj,
        renewablePercent,
        intensityMetrics,
      });

      // Derive EF sources from actual calculation data
      const efIds = [...new Set(calculatedEmissions.map((ce) => ce.efId))];
      const usedEfs = await prisma.emissionFactor.findMany({ where: { id: { in: efIds } } });
      const efSources = [...new Set(usedEfs.map((ef) => ef.source))];

      const scope3Categories = scope3.categories.map((c) => c.category);
      methodologyNote = generateMethodologyNote({
        gwpReport: 'AR5',
        efSources: efSources.length > 0 ? efSources : ['IPCC 2006 Guidelines', 'CEA CO2 Baseline Database'],
        boundaryApproach: 'Operational Control',
        scope3Categories,
      });
    }

    // Build scope3 by category JSON
    const scope3ByCategory: Record<string, number> = {};
    for (const cat of scope3.categories) {
      scope3ByCategory[cat.category] = cat.total;
    }

    // 7. Store a Report record in the database (with encryption)
    const encryptedReport = encryptReportData({
      scope1Total: scope1.total,
      scope2Total: scope2.total,
      scope3Total: scope3.total,
      scope3ByCategory: Object.keys(scope3ByCategory).length > 0
        ? JSON.stringify(scope3ByCategory)
        : null,
      energyConsumedGj,
      renewablePercent,
      intensityPerTurnover: intensityMetrics.perTurnover,
      intensityPerProduct: intensityMetrics.perProduct,
      intensityPerEmployee: intensityMetrics.perEmployee,
      dataQualityScore,
    });
    const report = await prisma.report.create({
      data: {
        orgId: period.orgId,
        periodId,
        scope1Total: encryptedReport.scope1Total as number,
        scope2Total: encryptedReport.scope2Total as number,
        scope3Total: encryptedReport.scope3Total as number,
        scope3ByCategory: encryptedReport.scope3ByCategory as string | null,
        energyConsumedGj: encryptedReport.energyConsumedGj as number,
        renewablePercent: encryptedReport.renewablePercent as number | null,
        intensityPerTurnover: encryptedReport.intensityPerTurnover as number | null,
        intensityPerProduct: encryptedReport.intensityPerProduct as number | null,
        intensityPerEmployee: encryptedReport.intensityPerEmployee as number | null,
        dataQualityScore: encryptedReport.dataQualityScore as number,
        reportFormat: body.format,
        encryptedData: encryptedReport.encryptedData,
      },
    });

    // 8. Return the report data
    return NextResponse.json({
      report,
      scopeTotals: { scope1, scope2, scope3 },
      grandTotal,
      energyConsumedGj,
      renewablePercent,
      intensityMetrics,
      dataQualityScore,
      ...(brsrOutput ? { brsr: brsrOutput } : {}),
      ...(methodologyNote ? { methodologyNote } : {}),
    });
  } catch (error) {
    console.error('POST /api/reports/[periodId] error:', error);
    return NextResponse.json(
      { error: 'Report generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
