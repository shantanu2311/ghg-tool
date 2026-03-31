import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const body = await request.json();
    const orgId = body.orgId || body.organisationId;

    // Verify org ownership
    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org || org.userId !== userId) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const period = await prisma.reportingPeriod.create({
      data: {
        orgId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        baseYearFlag: body.baseYearFlag ?? false,
      },
    });
    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error('POST /api/periods error:', error);
    return NextResponse.json({ error: 'Failed to create reporting period' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const orgId = request.nextUrl.searchParams.get('orgId');

    // Verify org ownership if orgId provided
    if (orgId) {
      const org = await prisma.organisation.findUnique({ where: { id: orgId } });
      if (!org || org.userId !== userId) {
        return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
      }
    }

    const periods = await prisma.reportingPeriod.findMany({
      where: orgId
        ? { orgId }
        : { organisation: { userId } },
      include: { organisation: { select: { name: true } } },
      orderBy: { startDate: 'desc' },
    });

    // Decrypt org name in included relation
    const decrypted = periods.map((p) => ({
      ...p,
      organisation: { name: decrypt(p.organisation.name) },
    }));

    return NextResponse.json(decrypted);
  } catch (error) {
    console.error('GET /api/periods error:', error);
    return NextResponse.json({ error: 'Failed to fetch reporting periods' }, { status: 500 });
  }
}
