import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const body = await request.json();
    const toNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v) as string | null;

    const org = await prisma.organisation.create({
      data: {
        userId,
        name: body.name || 'Unnamed Organisation',
        udyamNumber: toNull(body.udyamNumber),
        sector: body.sector || 'iron_steel',
        subSector: body.subSector || 'other',
        state: body.state || 'Unknown',
        district: toNull(body.district),
        employeeCount: body.employeeCount ?? null,
        turnoverBracket: toNull(body.turnoverBracket),
        contactEmail: toNull(body.contactEmail),
        contactPhone: toNull(body.contactPhone),
      },
    });
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error('POST /api/organisations error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create organisation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!isUserId(userId)) return userId;

    const orgs = await prisma.organisation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('GET /api/organisations error:', error);
    return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
  }
}
