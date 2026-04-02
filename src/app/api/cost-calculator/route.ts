import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { techId, schemeId, projectCostLakhs } = body;

    if (!techId || !schemeId) {
      return NextResponse.json({ error: 'techId and schemeId are required' }, { status: 400 });
    }

    // Look up tech for capex range
    const tech = await prisma.reductionTechnology.findUnique({
      where: { techId },
      select: { name: true, capexMinLakhs: true, capexMaxLakhs: true },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technology not found' }, { status: 404 });
    }

    // Look up scheme + link for subsidy details
    const scheme = await prisma.fundingScheme.findUnique({
      where: { schemeId },
    });

    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
    }

    const link = await prisma.techFundingLink.findFirst({
      where: {
        technology: { techId },
        funding: { schemeId },
      },
    });

    // Calculate costs
    const grossCostLakhs = projectCostLakhs ?? ((tech.capexMinLakhs ?? 0) + (tech.capexMaxLakhs ?? 0)) / 2;
    const subsidyPct = link?.subsidyPct ?? 0;
    const maxSubsidyLakhs = link?.maxAmountLakhs ?? Infinity;

    // For interest subvention schemes, estimate total savings over loan tenure
    const isInterestSubvention = scheme.supportType.toLowerCase().includes('interest');
    let subsidyAmountLakhs: number;
    let effectiveRatePct: number | null = null;

    if (isInterestSubvention) {
      // Estimate: subsidyPct interest saving on grossCost over 3 years
      const loanAmount = grossCostLakhs * 0.9; // 90% financed
      const annualSaving = loanAmount * (subsidyPct / 100);
      subsidyAmountLakhs = Math.min(annualSaving * 3, maxSubsidyLakhs);
      effectiveRatePct = 10 - subsidyPct; // assuming 10% market rate
    } else {
      // Capital subsidy
      subsidyAmountLakhs = Math.min(grossCostLakhs * (subsidyPct / 100), maxSubsidyLakhs);
    }

    const netCostLakhs = grossCostLakhs - subsidyAmountLakhs;
    const loanAmountLakhs = netCostLakhs * 0.9;
    const equityLakhs = netCostLakhs * 0.1;
    const interestRate = effectiveRatePct ?? 10;
    const tenureMonths = grossCostLakhs <= 100 ? 36 : 60;
    const monthlyRate = interestRate / 100 / 12;
    const monthlyEmiLakhs = loanAmountLakhs * (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    return NextResponse.json({
      technology: tech.name,
      scheme: scheme.name,
      grossCostLakhs: Math.round(grossCostLakhs * 100) / 100,
      subsidyType: isInterestSubvention ? 'interest_subvention' : 'capital_subsidy',
      subsidyPct,
      subsidyAmountLakhs: Math.round(subsidyAmountLakhs * 100) / 100,
      netCostLakhs: Math.round(netCostLakhs * 100) / 100,
      loanAmountLakhs: Math.round(loanAmountLakhs * 100) / 100,
      equityLakhs: Math.round(equityLakhs * 100) / 100,
      effectiveInterestPct: interestRate,
      tenureMonths,
      monthlyEmiLakhs: Math.round(monthlyEmiLakhs * 1000) / 1000,
    });
  } catch (error) {
    console.error('POST /api/cost-calculator error:', error);
    return NextResponse.json({ error: 'Failed to calculate cost' }, { status: 500 });
  }
}
