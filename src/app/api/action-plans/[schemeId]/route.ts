import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schemeId: string }> },
) {
  try {
    const { schemeId } = await params;

    const scheme = await prisma.fundingScheme.findUnique({
      where: { schemeId },
      include: {
        actionPlanSteps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
    }

    return NextResponse.json({
      scheme: {
        schemeId: scheme.schemeId,
        name: scheme.name,
        implementingAgency: scheme.implementingAgency,
        supportType: scheme.supportType,
        status: scheme.status,
        applicationUrl: scheme.applicationUrl,
      },
      steps: scheme.actionPlanSteps.map((s) => ({
        ...s,
        documentsNeeded: parseJson(s.documentsNeeded),
      })),
    });
  } catch (error) {
    console.error('GET /api/action-plans/[schemeId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch action plan' }, { status: 500 });
  }
}
