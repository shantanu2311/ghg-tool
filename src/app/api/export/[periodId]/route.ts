import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params;
    const format = request.nextUrl.searchParams.get('format') ?? 'json';

    // Validate format
    if (!['json', 'csv', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported: json, csv, xlsx' },
        { status: 400 }
      );
    }

    // XLSX: not yet implemented
    if (format === 'xlsx') {
      return NextResponse.json(
        { error: 'Excel export will be available in Sprint 7' },
        { status: 501 }
      );
    }

    // Fetch period
    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: { organisation: true },
    });
    if (!period) {
      return NextResponse.json({ error: 'Reporting period not found' }, { status: 404 });
    }

    // Fetch calculated emissions with related data
    const calculations = await prisma.calculatedEmission.findMany({
      where: { periodId },
      include: {
        activityData: {
          include: { facility: true },
        },
        emissionFactor: true,
      },
      orderBy: [
        { activityData: { scope: 'asc' } },
        { activityData: { sourceCategory: 'asc' } },
      ],
    });

    if (calculations.length === 0) {
      return NextResponse.json(
        { error: 'No calculated emissions found. Run calculation first.' },
        { status: 404 }
      );
    }

    // JSON export
    if (format === 'json') {
      let scope1Total = 0;
      let scope2Total = 0;
      let scope3Total = 0;

      const rows = calculations.map((c) => {
        if (c.activityData.scope === 1) scope1Total += c.totalCo2eTonnes;
        else if (c.activityData.scope === 2) scope2Total += c.totalCo2eTonnes;
        else if (c.activityData.scope === 3) scope3Total += c.totalCo2eTonnes;

        return {
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
        };
      });

      return NextResponse.json({
        organisation: period.organisation.name,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        exportedAt: new Date().toISOString(),
        scope1Total,
        scope2Total,
        scope3Total,
        grandTotal: scope1Total + scope2Total + scope3Total,
        calculations: rows,
      });
    }

    // CSV export
    const csvHeader = [
      'Scope',
      'Category',
      'FuelType',
      'Facility',
      'Quantity',
      'Unit',
      'CO2(t)',
      'CH4_CO2e(t)',
      'N2O_CO2e(t)',
      'Total_CO2e(t)',
      'EF_Source',
      'DataQuality',
    ].join(',');

    const csvRows = calculations.map((c) => {
      const fields = [
        c.activityData.scope,
        csvEscape(c.activityData.sourceCategory),
        csvEscape(c.activityData.fuelType),
        csvEscape(c.activityData.facility.name),
        c.activityData.quantity ?? '',
        c.activityData.unit ?? '',
        c.co2Tonnes.toFixed(6),
        c.ch4Co2eTonnes.toFixed(6),
        c.n2oCo2eTonnes.toFixed(6),
        c.totalCo2eTonnes.toFixed(6),
        csvEscape(c.calculationMethod),
        c.activityData.dataQualityFlag,
      ];
      return fields.join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const orgSlug = period.organisation.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `ghg_${orgSlug}_${periodId.slice(0, 8)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/export/[periodId] error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
