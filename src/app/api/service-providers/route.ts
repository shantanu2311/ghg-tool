import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const state = searchParams.get('state');

    const providers = await prisma.serviceProvider.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    // Filter in JS (JSON array fields can't be filtered in Prisma)
    const filtered = providers.filter((p) => {
      if (type && p.type !== type) return false;
      if (state) {
        const states = parseJson(p.states) ?? [];
        if (!states.includes(state) && !states.includes('Pan-India')) return false;
      }
      return true;
    });

    return NextResponse.json(
      filtered.map((p) => ({
        ...p,
        services: parseJson(p.services),
        states: parseJson(p.states),
        sectors: parseJson(p.sectors),
      })),
    );
  } catch (error) {
    console.error('GET /api/service-providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch service providers' }, { status: 500 });
  }
}
