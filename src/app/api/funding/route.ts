import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUserId, isUserId } from '@/lib/auth-helpers';
import { decrypt } from '@/lib/crypto';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get authenticated user's org context (optional — degrades gracefully)
    let orgContext: {
      sector: string;
      subSector: string;
      state: string;
      turnoverBracket: string | null;
    } | null = null;

    let facilityStates: string[] = [];

    const userIdResult = await getAuthenticatedUserId();
    if (isUserId(userIdResult)) {
      const org = await prisma.organisation.findFirst({
        where: { userId: userIdResult },
        select: { id: true, sector: true, subSector: true, state: true, turnoverBracket: true },
      });
      if (org) {
        orgContext = {
          sector: org.sector,
          subSector: org.subSector,
          state: decrypt(org.state) ?? '',
          turnoverBracket: org.turnoverBracket,
        };

        // Get facility states for state-level scheme filtering
        const facilities = await prisma.facility.findMany({
          where: { organisation: { id: org.id } },
          select: { state: true },
        });
        facilityStates = facilities.map((f) => decrypt(f.state)).filter((s): s is string => s !== null);
      }
    }

    // Fetch all schemes with tech links, and all techs with matching fields
    const [schemes, allTechs] = await Promise.all([
      prisma.fundingScheme.findMany({
        include: { techLinks: { include: { technology: true } } },
      }),
      prisma.reductionTechnology.findMany({
        select: {
          techId: true,
          name: true,
          category: true,
          applicableSectors: true,
          matchesSubSectors: true,
        },
      }),
    ]);

    // Filter schemes by status
    const filtered = schemes.filter((s) => {
      if (status && s.status !== status) return false;
      return true;
    });

    // Determine which techs are relevant to this user's sector/sub-sector
    const relevantTechIds = new Set<string>();
    if (orgContext) {
      for (const tech of allTechs) {
        const sectors = parseJson(tech.applicableSectors) ?? [];
        if (!sectors.includes(orgContext.sector)) continue;

        const subSectors = parseJson(tech.matchesSubSectors);
        if (subSectors && subSectors.length > 0 && !subSectors.includes(orgContext.subSector)) continue;

        relevantTechIds.add(tech.techId);
      }
    }

    // Determine which schemes are eligible based on sector + turnover + state
    const eligibleSchemeIds = new Set<string>();
    if (orgContext) {
      for (const s of filtered) {
        // Check sector coverage
        const sectors = parseJson(s.sectorsCovered);
        if (sectors && sectors.length > 0 && !sectors.includes(orgContext.sector)) continue;

        // Check turnover bracket
        const brackets = parseJson(s.turnoverBrackets);
        if (brackets && brackets.length > 0 && orgContext.turnoverBracket) {
          if (!brackets.includes(orgContext.turnoverBracket)) continue;
        }

        // Check state (only for state-specific schemes)
        const states = parseJson(s.applicableStates);
        if (states && states.length > 0) {
          const allStates = [orgContext.state, ...facilityStates];
          if (!states.some((st) => allStates.includes(st))) continue;
        }

        // Check if at least one linked technology is relevant to the user
        const hasRelevantTech = s.techLinks.some((tl) => relevantTechIds.has(tl.technology.techId));
        if (s.techLinks.length > 0 && !hasRelevantTech) continue;

        eligibleSchemeIds.add(s.schemeId);
      }
    }

    return NextResponse.json({
      schemes: filtered.map((s) => ({
        ...s,
        sectorsCovered: parseJson(s.sectorsCovered),
        requiredDocuments: parseJson(s.requiredDocuments),
        turnoverBrackets: parseJson(s.turnoverBrackets),
        applicableStates: parseJson(s.applicableStates),
        eligible: orgContext ? eligibleSchemeIds.has(s.schemeId) : null,
        techLinks: s.techLinks.map((tl) => ({
          ...tl,
          technology: {
            techId: tl.technology.techId,
            name: tl.technology.name,
            category: tl.technology.category,
          },
          relevant: orgContext ? relevantTechIds.has(tl.technology.techId) : null,
        })),
      })),
      context: orgContext
        ? {
            sector: orgContext.sector,
            subSector: orgContext.subSector,
            relevantTechIds: Array.from(relevantTechIds),
          }
        : null,
    });
  } catch (error) {
    console.error('GET /api/funding error:', error);
    return NextResponse.json({ error: 'Failed to fetch funding schemes' }, { status: 500 });
  }
}
