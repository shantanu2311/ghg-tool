import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope');
    const fuelOrActivity = request.nextUrl.searchParams.get('fuelOrActivity');
    const where: Record<string, unknown> = { active: true };
    if (scope) where.scope = parseInt(scope, 10);
    if (fuelOrActivity) where.fuelOrActivity = fuelOrActivity;
    const factors = await prisma.emissionFactor.findMany({
      where,
      orderBy: { fuelOrActivity: 'asc' },
    });
    return NextResponse.json(factors);
  } catch (error) {
    console.error('GET /api/emission-factors error:', error);
    return NextResponse.json({ error: 'Failed to fetch emission factors' }, { status: 500 });
  }
}
