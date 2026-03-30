import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sector = request.nextUrl.searchParams.get('sector');
    const subSector = request.nextUrl.searchParams.get('subSector');
    const where: Record<string, string> = {};
    if (sector) where.sector = sector;
    if (subSector) where.subSector = subSector;
    const benchmarks = await prisma.sectorBenchmark.findMany({
      where,
      orderBy: { sector: 'asc' },
    });
    return NextResponse.json(benchmarks);
  } catch (error) {
    console.error('GET /api/benchmarks error:', error);
    return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
  }
}
