import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const org = await prisma.organisation.create({
      data: {
        name: body.name,
        udyamNumber: body.udyamNumber ?? null,
        sector: body.sector,
        subSector: body.subSector,
        state: body.state,
        district: body.district ?? null,
        employeeCount: body.employeeCount ?? null,
        turnoverBracket: body.turnoverBracket ?? null,
        contactEmail: body.contactEmail ?? null,
        contactPhone: body.contactPhone ?? null,
      },
    });
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error('POST /api/organisations error:', error);
    return NextResponse.json({ error: 'Failed to create organisation' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const orgs = await prisma.organisation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('GET /api/organisations error:', error);
    return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
  }
}
