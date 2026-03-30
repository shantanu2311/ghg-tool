import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schemeId: string }> }
) {
  try {
    const { schemeId } = await params;

    const scheme = await prisma.fundingScheme.findUnique({
      where: { schemeId },
      include: { techLinks: { include: { technology: true } } },
    });

    if (!scheme) {
      return NextResponse.json({ error: 'Funding scheme not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...scheme,
      sectorsCovered: parseJson(scheme.sectorsCovered),
      requiredDocuments: parseJson(scheme.requiredDocuments),
      turnoverBrackets: parseJson(scheme.turnoverBrackets),
      applicableStates: parseJson(scheme.applicableStates),
      techLinks: scheme.techLinks.map((tl) => ({
        ...tl,
        technology: {
          techId: tl.technology.techId,
          name: tl.technology.name,
          category: tl.technology.category,
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/funding/[schemeId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch funding scheme' }, { status: 500 });
  }
}
