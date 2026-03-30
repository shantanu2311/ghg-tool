import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.activityData.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Activity data not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error) {
    console.error('GET /api/activity-data/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const entry = await prisma.activityData.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(entry);
  } catch (error) {
    console.error('PUT /api/activity-data/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update activity data' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.activityData.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/activity-data/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete activity data' }, { status: 500 });
  }
}
