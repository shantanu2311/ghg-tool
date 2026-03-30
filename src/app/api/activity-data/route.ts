import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk create: if body is an array
    if (Array.isArray(body)) {
      const entries = await prisma.$transaction(
        body.map((item: Record<string, unknown>) =>
          prisma.activityData.create({
            data: {
              facilityId: item.facilityId as string,
              periodId: item.periodId as string,
              scope: item.scope as number,
              sourceCategory: item.sourceCategory as string,
              fuelType: item.fuelType as string,
              description: (item.description as string) ?? null,
              inputMode: item.inputMode as string,
              quantity: (item.quantity as number) ?? null,
              unit: (item.unit as string) ?? null,
              spendInr: (item.spendInr as number) ?? null,
              dataQualityFlag: (item.dataQualityFlag as string) ?? 'SECONDARY',
              month: (item.month as number) ?? null,
            },
          })
        )
      );
      return NextResponse.json(entries, { status: 201 });
    }

    // Single create
    const entry = await prisma.activityData.create({
      data: {
        facilityId: body.facilityId,
        periodId: body.periodId,
        scope: body.scope,
        sourceCategory: body.sourceCategory,
        fuelType: body.fuelType,
        description: body.description ?? null,
        inputMode: body.inputMode,
        quantity: body.quantity ?? null,
        unit: body.unit ?? null,
        spendInr: body.spendInr ?? null,
        dataQualityFlag: body.dataQualityFlag ?? 'SECONDARY',
        month: body.month ?? null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST /api/activity-data error:', error);
    return NextResponse.json({ error: 'Failed to create activity data' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const periodId = request.nextUrl.searchParams.get('periodId');
    const facilityId = request.nextUrl.searchParams.get('facilityId');
    const where: Record<string, string> = {};
    if (periodId) where.periodId = periodId;
    if (facilityId) where.facilityId = facilityId;
    const data = await prisma.activityData.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/activity-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
  }
}
