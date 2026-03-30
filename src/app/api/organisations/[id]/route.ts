import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await prisma.organisation.findUnique({
      where: { id },
      include: { facilities: true, reportingPeriods: true },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (error) {
    console.error('GET /api/organisations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch organisation' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const org = await prisma.organisation.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(org);
  } catch (error) {
    console.error('PUT /api/organisations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update organisation' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.organisation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/organisations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete organisation' }, { status: 500 });
  }
}
