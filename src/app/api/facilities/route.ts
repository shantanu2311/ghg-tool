import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const body = await request.json();
    const toNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v) as string | null;

    const orgId = body.orgId || body.organisationId;
    const org = await prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org || org.userId !== userId) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const facility = await prisma.facility.create({
      data: {
        orgId,
        name: body.name || 'Unnamed Facility',
        address: toNull(body.address),
        state: body.state || 'Unknown',
        district: toNull(body.district),
        gridRegion: body.gridRegion || 'Unknown',
        activityType: body.activityType || 'manufacturing',
      },
    });
    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    console.error('POST /api/facilities error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create facility';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (orgId) {
      const org = await prisma.organisation.findUnique({ where: { id: orgId } });
      if (!org || org.userId !== userId) {
        return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
      }
    }

    const facilities = await prisma.facility.findMany({
      where: orgId ? { orgId } : { organisation: { userId } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(facilities);
  } catch (error) {
    console.error('GET /api/facilities error:', error);
    return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
  }
}
