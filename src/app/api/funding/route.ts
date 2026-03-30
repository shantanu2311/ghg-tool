import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const turnoverBracket = searchParams.get('turnoverBracket');

    const schemes = await prisma.fundingScheme.findMany({
      include: { techLinks: { include: { technology: true } } },
    });

    const filtered = schemes.filter((s) => {
      if (status && s.status !== status) return false;
      if (turnoverBracket) {
        const brackets = parseJson(s.turnoverBrackets);
        if (brackets && brackets.length > 0 && !brackets.includes(turnoverBracket)) return false;
      }
      return true;
    });

    return NextResponse.json(filtered.map((s) => ({
      ...s,
      sectorsCovered: parseJson(s.sectorsCovered),
      requiredDocuments: parseJson(s.requiredDocuments),
      turnoverBrackets: parseJson(s.turnoverBrackets),
      applicableStates: parseJson(s.applicableStates),
      techLinks: s.techLinks.map((tl) => ({
        ...tl,
        technology: {
          techId: tl.technology.techId,
          name: tl.technology.name,
          category: tl.technology.category,
        },
      })),
    })));
  } catch (error) {
    console.error('GET /api/funding error:', error);
    return NextResponse.json({ error: 'Failed to fetch funding schemes' }, { status: 500 });
  }
}
