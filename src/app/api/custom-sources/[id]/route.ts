import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';

/** Verify the custom source belongs to the authenticated user (source → org → userId). */
async function verifyOwnership(sourceId: string, userId: string) {
  const source = await prisma.customEmissionSource.findUnique({
    where: { id: sourceId },
    include: { organisation: { select: { userId: true } } },
  });
  if (!source || source.organisation.userId !== userId) return null;
  return source;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const { id } = await params;
    const source = await verifyOwnership(id, userId);
    if (!source) {
      return NextResponse.json({ error: 'Custom source not found' }, { status: 404 });
    }
    return NextResponse.json(source);
  } catch (error) {
    console.error('GET /api/custom-sources/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch custom source' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const { id } = await params;
    const existing = await verifyOwnership(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Custom source not found' }, { status: 404 });
    }

    const body = await request.json();
    const source = await prisma.customEmissionSource.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(source);
  } catch (error) {
    console.error('PUT /api/custom-sources/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update custom source' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const { id } = await params;
    const existing = await verifyOwnership(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Custom source not found' }, { status: 404 });
    }

    // Soft delete — set active: false
    await prisma.customEmissionSource.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/custom-sources/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete custom source' }, { status: 500 });
  }
}
