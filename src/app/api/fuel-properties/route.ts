import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const fuels = await prisma.fuelProperty.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(fuels);
  } catch (error) {
    console.error('GET /api/fuel-properties error:', error);
    return NextResponse.json({ error: 'Failed to fetch fuel properties' }, { status: 500 });
  }
}
