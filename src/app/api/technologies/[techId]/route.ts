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

    const tech = await prisma.reductionTechnology.findUnique({
      where: { techId },
      include: { fundingLinks: { include: { funding: true } } },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technology not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...tech,
      applicableSectors: parseJson(tech.applicableSectors),
      matchesFuelTypes: parseJson(tech.matchesFuelTypes),
      matchesCategories: parseJson(tech.matchesCategories),
      matchesSubSectors: parseJson(tech.matchesSubSectors),
      indianClusters: parseJson(tech.indianClusters),
      fundingLinks: tech.fundingLinks.map((fl) => ({
        ...fl,
        funding: {
          ...fl.funding,
          sectorsCovered: parseJson(fl.funding.sectorsCovered),
          requiredDocuments: parseJson(fl.funding.requiredDocuments),
          turnoverBrackets: parseJson(fl.funding.turnoverBrackets),
          applicableStates: parseJson(fl.funding.applicableStates),
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/technologies/[techId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch technology' }, { status: 500 });
  }
}
