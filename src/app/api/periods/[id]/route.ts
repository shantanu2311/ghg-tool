import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const { id } = await params;
    const period = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: {
        organisation: true,
        _count: {
          select: {
            activityData: true,
            calculatedEmissions: true,
          },
        },
      },
    });
    if (!period || period.organisation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: { organisation: true },
    });
    if (!existing || existing.organisation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId; // 401 response

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: { organisation: true },
    });
    if (!existing || existing.organisation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.reportingPeriod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/periods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete reporting period' }, { status: 500 });
  }
}
