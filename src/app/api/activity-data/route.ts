import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { encryptActivityData, decryptActivityData } from '@/lib/analysis-crypto';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const body = await request.json();

    // Support both flat array and { periodId, activities: [...] } wrapper
    let items: Record<string, unknown>[] | null = null;
    let sharedPeriodId: string | null = null;

    if (Array.isArray(body)) {
      items = body;
    } else if (body.activities && Array.isArray(body.activities)) {
      items = body.activities;
      sharedPeriodId = body.periodId ?? null;
    }

    // Determine the periodId for ownership check
    const checkPeriodId = sharedPeriodId ?? (items ? (items[0]?.periodId as string) : body.periodId);
    if (checkPeriodId) {
      const period = await prisma.reportingPeriod.findUnique({
        where: { id: checkPeriodId },
        include: { organisation: true },
      });
      if (!period || period.organisation.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    }

    if (items) {
      const entries = await prisma.$transaction(
        items.map((item: Record<string, unknown>) => {
          const encrypted = encryptActivityData({
            quantity: (item.quantity as number) ?? null,
            spendInr: (item.spendInr as number) ?? null,
            description: (item.description as string) ?? null,
          });
          return prisma.activityData.create({
            data: {
              facilityId: item.facilityId as string,
              periodId: (item.periodId as string) ?? sharedPeriodId!,
              scope: item.scope as number,
              sourceCategory: item.sourceCategory as string,
              fuelType: item.fuelType as string,
              description: encrypted.description,
              inputMode: item.inputMode as string,
              quantity: encrypted.quantity,
              unit: (item.unit as string) ?? null,
              spendInr: encrypted.spendInr,
              dataQualityFlag: (item.dataQualityFlag as string) ?? 'SECONDARY',
              month: (item.month as number) ?? null,
              encryptedData: encrypted.encryptedData,
            },
          });
        })
      );
      return NextResponse.json(entries, { status: 201 });
    }

    // Single create
    const encrypted = encryptActivityData({
      quantity: body.quantity ?? null,
      spendInr: body.spendInr ?? null,
      description: body.description ?? null,
    });
    const entry = await prisma.activityData.create({
      data: {
        facilityId: body.facilityId,
        periodId: body.periodId,
        scope: body.scope,
        sourceCategory: body.sourceCategory,
        fuelType: body.fuelType,
        description: encrypted.description,
        inputMode: body.inputMode,
        quantity: encrypted.quantity,
        unit: body.unit ?? null,
        spendInr: encrypted.spendInr,
        dataQualityFlag: body.dataQualityFlag ?? 'SECONDARY',
        month: body.month ?? null,
        encryptedData: encrypted.encryptedData,
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
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const periodId = request.nextUrl.searchParams.get('periodId');
    const facilityId = request.nextUrl.searchParams.get('facilityId');

    // If periodId provided, verify ownership
    if (periodId) {
      const period = await prisma.reportingPeriod.findUnique({
        where: { id: periodId },
        include: { organisation: true },
      });
      if (!period || period.organisation.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    }

    // Filter activity data to only orgs owned by this user
    const where: Record<string, unknown> = {};
    if (periodId) where.periodId = periodId;
    if (facilityId) where.facilityId = facilityId;

    // Always scope to user's organisations
    where.period = {
      organisation: { userId },
    };

    const data = await prisma.activityData.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const decryptedData = data.map((row) =>
      decryptActivityData(row as unknown as Record<string, unknown>)
    );
    return NextResponse.json(decryptedData);
  } catch (error) {
    console.error('GET /api/activity-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
  }
}
