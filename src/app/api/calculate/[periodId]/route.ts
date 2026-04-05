import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { calculateInventory } from '@/lib/calc-engine';
import { decryptActivityData, encryptEmissionData } from '@/lib/analysis-crypto';
import type {
  CalculationInput,
  ActivityDataInput,
  FuelPropertyData,
  EmissionFactorData,
  GwpSet,
  UnitConversionData,
  FacilityInput,
  Scope,
  InputMode,
  DataQuality,
  GridRegion,
} from '@/lib/calc-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const { periodId } = await params;

    // Parse optional body
    let body: { productionTonnes?: number; annualTurnoverLakhInr?: number } = {};
    try {
      body = await request.json();
    } catch {
      // No body provided — that's fine
    }

    // 1. Fetch period with organisation
    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: {
        organisation: true,
      },
    });
    if (!period || period.organisation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Fetch all activity data for this period with facility
    const activityRowsRaw = await prisma.activityData.findMany({
      where: { periodId },
      include: { facility: true },
    });
    // Decrypt activity data to get real quantities
    const activityRows = activityRowsRaw.map((row) =>
      decryptActivityData(row as unknown as Record<string, unknown>)
    ) as typeof activityRowsRaw;
    if (activityRows.length === 0) {
      return NextResponse.json(
        { error: 'No activity data found for this period' },
        { status: 400 }
      );
    }

    // 3. Fetch reference data
    const [fuelRows, efRows, gwpRows, conversionRows] = await Promise.all([
      prisma.fuelProperty.findMany(),
      prisma.emissionFactor.findMany({ where: { active: true } }),
      prisma.gwpValue.findMany({ where: { assessmentReport: 'AR5' } }),
      prisma.unitConversion.findMany(),
    ]);

    // 4. Build CalculationInput

    // Map fuel properties
    const fuelProperties: FuelPropertyData[] = fuelRows.map((fp) => ({
      code: fp.code,
      name: fp.name,
      category: fp.category,
      baseUnit: fp.baseUnit,
      density: fp.density,
      ncvTjPerGg: fp.ncvTjPerGg,
      co2EfKgPerTj: fp.co2EfKgPerTj,
      defaultPriceInr: fp.defaultPriceInr,
      alternateUnits: fp.alternateUnits ? JSON.parse(fp.alternateUnits) : [],
    }));

    // Map emission factors
    const emissionFactors: EmissionFactorData[] = efRows.map((ef) => ({
      id: ef.id,
      fuelOrActivity: ef.fuelOrActivity,
      scope: ef.scope as Scope,
      scopeCategory: ef.scopeCategory,
      co2Ef: ef.co2Ef,
      ch4Ef: ef.ch4Ef,
      n2oEf: ef.n2oEf,
      efUnit: ef.efUnit,
      region: ef.region,
      source: ef.source,
      sourceVersion: ef.sourceVersion,
    }));

    // Build GWP set
    const gwpSet: GwpSet = { report: 'AR5', CO2: 1, CH4: 28, N2O: 265 };
    for (const row of gwpRows) {
      gwpSet[row.gas] = row.gwp;
    }

    // Map unit conversions
    const unitConversions: UnitConversionData[] = conversionRows.map((uc) => ({
      fromUnit: uc.fromUnit,
      toUnit: uc.toUnit,
      factor: uc.factor,
      fuelCode: uc.fuelCode,
    }));

    // Build unique facilities
    const facilityMap = new Map<string, FacilityInput>();
    for (const row of activityRows) {
      if (!facilityMap.has(row.facilityId)) {
        facilityMap.set(row.facilityId, {
          id: row.facility.id,
          name: row.facility.name,
          state: row.facility.state,
          gridRegion: row.facility.gridRegion as GridRegion,
          activityType: row.facility.activityType,
        });
      }
    }

    // Map activity data
    const activityData: ActivityDataInput[] = activityRows.map((ad) => ({
      id: ad.id,
      facilityId: ad.facilityId,
      scope: ad.scope as Scope,
      sourceCategory: ad.sourceCategory,
      fuelType: ad.fuelType,
      description: ad.description ?? undefined,
      inputMode: ad.inputMode as InputMode,
      quantity: ad.quantity ?? undefined,
      unit: ad.unit ?? undefined,
      spendInr: ad.spendInr ?? undefined,
      dataQualityFlag: ad.dataQualityFlag as DataQuality,
      month: ad.month ?? undefined,
    }));

    // Derive productionTonnes from process activities if not provided
    const processTotal = activityRows
      .filter((a) => a.scope === 1 && a.sourceCategory === 'process' && a.quantity != null)
      .reduce((sum, a) => sum + (a.quantity ?? 0), 0);
    const productionTonnes = body.productionTonnes ?? (processTotal || undefined);

    const input: CalculationInput = {
      organisationId: period.orgId,
      periodId,
      organisation: {
        name: period.organisation.name,
        udyamNumber: period.organisation.udyamNumber ?? undefined,
        sector: period.organisation.sector,
        subSector: period.organisation.subSector,
        state: period.organisation.state,
        district: period.organisation.district ?? undefined,
        employeeCount: period.organisation.employeeCount ?? undefined,
        turnoverBracket: period.organisation.turnoverBracket ?? undefined,
      },
      facilities: Array.from(facilityMap.values()),
      activityData,
      fuelProperties,
      emissionFactors,
      gwpSet,
      unitConversions,
      productionTonnes,
      annualTurnoverLakhInr: body.annualTurnoverLakhInr,
    };

    // 5. Run calculation
    const result = calculateInventory(input);

    // 6. Store results in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing calculated emissions for this period
      await tx.calculatedEmission.deleteMany({ where: { periodId } });

      // Create new records
      for (const calc of result.calculations) {
        const encryptedEmission = encryptEmissionData({
          co2Tonnes: calc.co2Tonnes,
          ch4Co2eTonnes: calc.ch4Co2eTonnes,
          n2oCo2eTonnes: calc.n2oCo2eTonnes,
          totalCo2eTonnes: calc.totalCo2eTonnes,
          calculationSteps: JSON.stringify(calc.calculationSteps),
        });
        await tx.calculatedEmission.create({
          data: {
            activityDataId: calc.activityDataId,
            efId: calc.efId,
            periodId,
            co2Tonnes: encryptedEmission.co2Tonnes,
            ch4Co2eTonnes: encryptedEmission.ch4Co2eTonnes,
            n2oCo2eTonnes: encryptedEmission.n2oCo2eTonnes,
            totalCo2eTonnes: encryptedEmission.totalCo2eTonnes,
            calculationMethod: `${calc.efSource}${calc.efVersion ? ` (${calc.efVersion})` : ''}`,
            calculationSteps: encryptedEmission.calculationSteps,
            encryptedData: encryptedEmission.encryptedData,
          },
        });
      }

      // Update period status
      await tx.reportingPeriod.update({
        where: { id: periodId },
        data: { status: 'calculated', resultJson: JSON.stringify(result) },
      });
    });

    // 7. Return result
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/calculate/[periodId] error:', error);
    return NextResponse.json(
      { error: 'Calculation failed', details: String(error) },
      { status: 500 }
    );
  }
}
