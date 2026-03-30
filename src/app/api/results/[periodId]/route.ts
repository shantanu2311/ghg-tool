import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params;

    // 1. Fetch period with organisation
    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: { organisation: true },
    });
    if (!period) {
      return NextResponse.json({ error: 'Reporting period not found' }, { status: 404 });
    }

    // 2. Fetch calculated emissions with related data
    const calculations = await prisma.calculatedEmission.findMany({
      where: { periodId },
      include: {
        activityData: {
          include: { facility: true },
        },
        emissionFactor: true,
      },
    });

    if (calculations.length === 0) {
      return NextResponse.json(
        { error: 'No calculated emissions found. Run calculation first.' },
        { status: 404 }
      );
    }

    // 3. Group by scope and compute totals
    let scope1Total = 0;
    let scope2Total = 0;
    let scope3Total = 0;

    const scopeGroups: Record<number, typeof calculations> = { 1: [], 2: [], 3: [] };

    for (const calc of calculations) {
      const scope = calc.activityData.scope;
      if (scope === 1) scope1Total += calc.totalCo2eTonnes;
      else if (scope === 2) scope2Total += calc.totalCo2eTonnes;
      else if (scope === 3) scope3Total += calc.totalCo2eTonnes;

      if (scopeGroups[scope]) {
        scopeGroups[scope].push(calc);
      }
    }

    const grandTotal = scope1Total + scope2Total + scope3Total;

    // 4. Data quality breakdown
    const activityRows = await prisma.activityData.findMany({
      where: { periodId },
    });

    const dataQualityBreakdown = {
      primary: 0,
      secondary: 0,
      estimated: 0,
      total: activityRows.length,
    };
    for (const row of activityRows) {
      if (row.dataQualityFlag === 'PRIMARY') dataQualityBreakdown.primary++;
      else if (row.dataQualityFlag === 'SECONDARY') dataQualityBreakdown.secondary++;
      else if (row.dataQualityFlag === 'ESTIMATED') dataQualityBreakdown.estimated++;
    }

    // 5. Top sources by emission
    const sourceMap = new Map<string, number>();
    for (const calc of calculations) {
      const key = `${calc.activityData.sourceCategory}:${calc.activityData.fuelType}`;
      sourceMap.set(key, (sourceMap.get(key) ?? 0) + calc.totalCo2eTonnes);
    }
    const topSources = Array.from(sourceMap.entries())
      .map(([source, co2e]) => ({
        source,
        co2e,
        percent: grandTotal > 0 ? (co2e / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.co2e - a.co2e)
      .slice(0, 10);

    return NextResponse.json({
      period: {
        id: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        organisation: {
          id: period.organisation.id,
          name: period.organisation.name,
          sector: period.organisation.sector,
          subSector: period.organisation.subSector,
        },
      },
      scope1Total,
      scope2Total,
      scope3Total,
      grandTotal,
      calculations: calculations.map((c) => ({
        id: c.id,
        scope: c.activityData.scope,
        sourceCategory: c.activityData.sourceCategory,
        fuelType: c.activityData.fuelType,
        facility: c.activityData.facility.name,
        quantity: c.activityData.quantity,
        unit: c.activityData.unit,
        co2Tonnes: c.co2Tonnes,
        ch4Co2eTonnes: c.ch4Co2eTonnes,
        n2oCo2eTonnes: c.n2oCo2eTonnes,
        totalCo2eTonnes: c.totalCo2eTonnes,
        efSource: c.calculationMethod,
        dataQuality: c.activityData.dataQualityFlag,
        calculationSteps: c.calculationSteps ? JSON.parse(c.calculationSteps) : null,
      })),
      topSources,
      dataQualityBreakdown,
    });
  } catch (error) {
    console.error('GET /api/results/[periodId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
