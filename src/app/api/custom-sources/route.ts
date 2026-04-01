import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    // If orgId specified, verify ownership then return sources for that org
    if (orgId) {
      const org = await prisma.organisation.findUnique({ where: { id: orgId } });
      if (!org || org.userId !== userId) {
        return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
      }
      const sources = await prisma.customEmissionSource.findMany({
        where: { orgId, active: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(sources);
    }

    // Otherwise, return all sources for all user's orgs
    const orgs = await prisma.organisation.findMany({
      where: { userId },
      select: { id: true },
    });
    const orgIds = orgs.map((o) => o.id);
    const sources = await prisma.customEmissionSource.findMany({
      where: { orgId: { in: orgIds }, active: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(sources);
  } catch (error) {
    console.error('GET /api/custom-sources error:', error);
    return NextResponse.json({ error: 'Failed to fetch custom sources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const body = await request.json();

    // Verify org ownership
    const org = await prisma.organisation.findUnique({ where: { id: body.orgId } });
    if (!org || org.userId !== userId) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    // Auto-generate code from name
    const code = `CUSTOM_${(body.name as string || 'UNNAMED').toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30)}`;

    const source = await prisma.customEmissionSource.create({
      data: {
        orgId: body.orgId,
        name: body.name,
        code,
        scope: body.scope,
        sourceCategory: body.sourceCategory,
        description: body.description ?? null,
        co2EfKgPerUnit: body.co2EfKgPerUnit,
        ch4EfKgPerUnit: body.ch4EfKgPerUnit ?? null,
        n2oEfKgPerUnit: body.n2oEfKgPerUnit ?? null,
        efSource: body.efSource,
        efSourceUrl: body.efSourceUrl ?? null,
        baseUnit: body.baseUnit,
        density: body.density ?? null,
        ncvTjPerGg: body.ncvTjPerGg ?? null,
        defaultPriceInr: body.defaultPriceInr ?? null,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('POST /api/custom-sources error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create custom source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
