import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ techId: string }> }
) {
  try {
    const { techId } = await params;

    // Find the technology by techId code (e.g. "T001")
    const tech = await prisma.reductionTechnology.findUnique({
      where: { techId },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technology not found' }, { status: 404 });
    }

    const links = await prisma.techFundingLink.findMany({
      where: { techId: tech.id },
      include: { funding: true },
    });

    return NextResponse.json(links.map((l) => ({
      subsidyPct: l.subsidyPct,
      maxAmountLakhs: l.maxAmountLakhs,
      notes: l.notes,
      funding: {
        ...l.funding,
        sectorsCovered: parseJson(l.funding.sectorsCovered),
        requiredDocuments: parseJson(l.funding.requiredDocuments),
        turnoverBrackets: parseJson(l.funding.turnoverBrackets),
        applicableStates: parseJson(l.funding.applicableStates),
      },
    })));
  } catch (error) {
    console.error('GET /api/funding/for-tech/[techId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch funding for technology' }, { status: 500 });
  }
}
