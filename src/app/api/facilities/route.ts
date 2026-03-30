import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const facility = await prisma.facility.create({
      data: {
        orgId: body.orgId || body.organisationId,
        name: body.name,
        address: body.address ?? null,
        state: body.state,
        district: body.district ?? null,
        gridRegion: body.gridRegion,
        activityType: body.activityType,
      },
    });
    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    console.error('POST /api/facilities error:', error);
    return NextResponse.json({ error: 'Failed to create facility' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('orgId');
    const where = orgId ? { orgId } : {};
    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(facilities);
  } catch (error) {
    console.error('GET /api/facilities error:', error);
    return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
  }
}
