import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET() {
  try {
    const entries = await prisma.jargonEntry.findMany({
      orderBy: { term: 'asc' },
    });

    return NextResponse.json(
      entries.map((e) => ({
        ...e,
        relatedTerms: parseJson(e.relatedTerms),
      })),
    );
  } catch (error) {
    console.error('GET /api/jargon error:', error);
    return NextResponse.json({ error: 'Failed to fetch jargon entries' }, { status: 500 });
  }
}
