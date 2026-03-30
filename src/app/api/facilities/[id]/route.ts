import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: { activityData: true },
    });
    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }
    return NextResponse.json(facility);
  } catch (error) {
    console.error('GET /api/facilities/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch facility' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const facility = await prisma.facility.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(facility);
  } catch (error) {
    console.error('PUT /api/facilities/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update facility' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.facility.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/facilities/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete facility' }, { status: 500 });
  }
}
