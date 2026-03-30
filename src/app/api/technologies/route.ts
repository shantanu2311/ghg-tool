import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const subSector = searchParams.get('subSector');

    const techs = await prisma.reductionTechnology.findMany({
      include: { fundingLinks: { include: { funding: true } } },
    });

    // Filter in JS since JSON arrays are stored as strings in PostgreSQL text fields
    const filtered = techs.filter((t) => {
      if (sector) {
        const sectors = parseJson(t.applicableSectors);
        if (sectors && !sectors.includes(sector)) return false;
      }
      if (subSector) {
        const subs = parseJson(t.matchesSubSectors);
        // null matchesSubSectors = applies to all
        if (subs && subs.length > 0 && !subs.includes(subSector)) return false;
      }
      return true;
    });

    return NextResponse.json(filtered.map((t) => ({
      ...t,
      applicableSectors: parseJson(t.applicableSectors),
      matchesFuelTypes: parseJson(t.matchesFuelTypes),
      matchesCategories: parseJson(t.matchesCategories),
      matchesSubSectors: parseJson(t.matchesSubSectors),
      indianClusters: parseJson(t.indianClusters),
      fundingLinks: t.fundingLinks.map((fl) => ({
        ...fl,
        funding: {
          ...fl.funding,
          sectorsCovered: parseJson(fl.funding.sectorsCovered),
          requiredDocuments: parseJson(fl.funding.requiredDocuments),
          turnoverBrackets: parseJson(fl.funding.turnoverBrackets),
          applicableStates: parseJson(fl.funding.applicableStates),
        },
      })),
    })));
  } catch (error) {
    console.error('GET /api/technologies error:', error);
    return NextResponse.json({ error: 'Failed to fetch technologies' }, { status: 500 });
  }
}
