import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const period = await prisma.reportingPeriod.create({
      data: {
        orgId: body.orgId || body.organisationId,
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
    const orgId = request.nextUrl.searchParams.get('orgId');
    const where = orgId ? { orgId } : {};
    const periods = await prisma.reportingPeriod.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(periods);
  } catch (error) {
    console.error('GET /api/periods error:', error);
    return NextResponse.json({ error: 'Failed to fetch reporting periods' }, { status: 500 });
  }
}
