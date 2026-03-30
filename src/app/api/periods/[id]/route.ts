import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const period = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            activityData: true,
            calculatedEmissions: true,
          },
        },
      },
    });
    if (!period) {
      return NextResponse.json({ error: 'Reporting period not found' }, { status: 404 });
    }
    return NextResponse.json(period);
  } catch (error) {
    console.error('GET /api/periods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch reporting period' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    const period = await prisma.reportingPeriod.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(period);
  } catch (error) {
    console.error('PUT /api/periods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update reporting period' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.reportingPeriod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/periods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete reporting period' }, { status: 500 });
  }
}
