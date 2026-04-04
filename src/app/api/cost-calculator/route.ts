import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { techId, schemeId, projectCostLakhs, enterpriseSize } = body;

    if (!techId || !schemeId) {
      return NextResponse.json({ error: 'techId and schemeId are required' }, { status: 400 });
    }
    if (projectCostLakhs != null && projectCostLakhs <= 0) {
      return NextResponse.json({ error: 'projectCostLakhs must be positive' }, { status: 400 });
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
    let subsidyPct = link?.subsidyPct ?? 0;
    const maxSubsidyLakhs = link?.maxAmountLakhs ?? Infinity;

    // ADEETIE: 5% for micro/small, 3% for medium
    if (schemeId === 'S001' && enterpriseSize === 'medium') {
      subsidyPct = 3;
    }

    // Determine tenure first (needed for interest subvention calc)
    const tenureMonths = grossCostLakhs <= 100 ? 36 : 60;
    const tenureYears = tenureMonths / 12;

    // For interest subvention schemes, estimate total savings over loan tenure
    const isInterestSubvention = scheme.supportType.toLowerCase().includes('interest');
    let subsidyAmountLakhs: number;
    let effectiveRatePct: number | null = null;

    if (isInterestSubvention) {
      // Interest subvention: lower rate over full loan tenure, not principal reduction
      const loanAmount = grossCostLakhs * 0.9; // 90% financed
      const annualSaving = loanAmount * (subsidyPct / 100);
      subsidyAmountLakhs = Math.min(annualSaving * tenureYears, maxSubsidyLakhs);
      effectiveRatePct = 10 - subsidyPct; // assuming 10% market rate
    } else {
      // Capital subsidy — reduces principal
      subsidyAmountLakhs = Math.min(grossCostLakhs * (subsidyPct / 100), maxSubsidyLakhs);
    }

    // For interest subvention: subsidy reduces interest cost, NOT principal
    // For capital subsidy: subsidy reduces the project cost directly
    let loanAmountLakhs: number;
    let equityLakhs: number;
    let netCostLakhs: number;

    if (isInterestSubvention) {
      netCostLakhs = grossCostLakhs; // no principal reduction
      loanAmountLakhs = grossCostLakhs * 0.9;
      equityLakhs = grossCostLakhs * 0.1;
    } else {
      netCostLakhs = grossCostLakhs - subsidyAmountLakhs;
      loanAmountLakhs = netCostLakhs * 0.9;
      equityLakhs = netCostLakhs * 0.1;
    }

    const interestRate = Math.max(effectiveRatePct ?? 10, 0.5); // floor at 0.5% to avoid division by zero
    const monthlyRate = interestRate / 100 / 12;
    const monthlyEmiLakhs = loanAmountLakhs > 0
      ? loanAmountLakhs * (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      : 0;

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
