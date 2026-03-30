/**
 * Dummy test: Generate a realistic Emission Reduction Plan PDF
 * for a hypothetical Indian steel MSME (EAF mini-mill in Maharashtra).
 *
 * Run: node scripts/test-pdf-report.mjs
 * Output: Emission-Reduction-Plan.pdf in project root
 */

import { writeFileSync } from 'fs';
import { createRequire } from 'module';

// jsPDF needs to be imported as CJS in Node
const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

// ── Realistic dummy data: Rathi Steel Works, Nashik ──────────────────────
// EAF + Re-Rolling facility, ~800 tCO2e/year baseline

const recommendations = [
  {
    techId: 'T001',
    name: 'Variable Frequency Drives (VFDs)',
    category: 'Energy Efficiency - Cross Sector',
    reductionMinTonnes: 24,
    reductionMaxTonnes: 48,
    reductionMidTonnes: 36,
    energySavingMinGj: 120,
    energySavingMaxGj: 240,
    costSavingMinInr: 180000,
    costSavingMaxInr: 360000,
    capexMinLakhs: 5,
    capexMaxLakhs: 12,
    paybackMinYears: 1.5,
    paybackMaxYears: 3,
    paybackEstimateYears: 2.2,
    pctOfTotal: 4.5,
    matchedEmissionsTonnes: 160,
    matchedEnergyGj: 800,
    scopeAddressed: 'Scope 2',
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    description: 'VFDs on furnace blowers, cooling fans, and material handling conveyors',
    source: 'BEE PAT Scheme',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    fundingMatches: [
      {
        schemeId: 'S001',
        name: 'BEE PAT Scheme',
        implementingAgency: 'Bureau of Energy Efficiency',
        supportType: 'Energy Saving Certificates (ESCerts) tradeable on exchanges',
        financialDetails: 'ESCerts valued at Rs.1,200–2,400 per tonne of oil equivalent saved',
        eligibilityCriteria: 'Designated consumers under PAT',
        requiredDocuments: ['Energy Audit Report', 'Baseline Assessment', 'M&V Protocol'],
        applicationUrl: 'https://beeindia.gov.in/content/pat-scheme',
        subsidyPct: null,
        maxAmountLakhs: null,
        notes: 'Applicable for larger MSMEs',
        status: 'Active',
        netCapexMinLakhs: null,
        netCapexMaxLakhs: null,
      },
    ],
    bestNetCapexMinLakhs: null,
    bestNetCapexMaxLakhs: null,
  },
  {
    techId: 'T002',
    name: 'LED Lighting + Smart Controls',
    category: 'Energy Efficiency - Cross Sector',
    reductionMinTonnes: 8,
    reductionMaxTonnes: 19,
    reductionMidTonnes: 13.5,
    energySavingMinGj: 40,
    energySavingMaxGj: 95,
    costSavingMinInr: 60000,
    costSavingMaxInr: 142000,
    capexMinLakhs: 1,
    capexMaxLakhs: 3,
    paybackMinYears: 0.5,
    paybackMaxYears: 1.5,
    paybackEstimateYears: 1.0,
    pctOfTotal: 1.7,
    matchedEmissionsTonnes: 160,
    matchedEnergyGj: 800,
    scopeAddressed: 'Scope 2',
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    description: 'Replace conventional lighting with LED + occupancy & daylight sensors',
    source: 'BEE',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    fundingMatches: [],
    bestNetCapexMinLakhs: null,
    bestNetCapexMaxLakhs: null,
  },
  {
    techId: 'T005',
    name: 'Rooftop Solar PV',
    category: 'Green Electricity',
    reductionMinTonnes: 56,
    reductionMaxTonnes: 96,
    reductionMidTonnes: 76,
    energySavingMinGj: 280,
    energySavingMaxGj: 480,
    costSavingMinInr: 420000,
    costSavingMaxInr: 720000,
    capexMinLakhs: 20,
    capexMaxLakhs: 40,
    paybackMinYears: 3,
    paybackMaxYears: 5,
    paybackEstimateYears: 4.0,
    pctOfTotal: 9.5,
    matchedEmissionsTonnes: 160,
    matchedEnergyGj: 800,
    scopeAddressed: 'Scope 2',
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    description: 'Grid-connected rooftop solar (100–500 kWp) with net metering',
    source: 'MNRE',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    fundingMatches: [
      {
        schemeId: 'S004',
        name: 'PM-KUSUM Component-C',
        implementingAgency: 'MNRE',
        supportType: 'CFA (Central Financial Assistance) for solarisation of grid-connected agriculture pumps',
        financialDetails: '30% CFA for general states, 50% for NE/special states',
        eligibilityCriteria: 'Grid-connected consumers, capacity up to 500 kW',
        requiredDocuments: ['DISCOM NOC', 'Structural Feasibility Report', 'Net Metering Application'],
        applicationUrl: 'https://pmkusum.mnre.gov.in/',
        subsidyPct: 30,
        maxAmountLakhs: 20,
        notes: 'Component-C applicable for industrial rooftop',
        status: 'Active',
        netCapexMinLakhs: 14,
        netCapexMaxLakhs: 28,
      },
      {
        schemeId: 'S005',
        name: 'MSME Champions Scheme',
        implementingAgency: 'Ministry of MSME',
        supportType: 'Subsidised term loans with interest subvention',
        financialDetails: '3% interest subvention on term loans for technology upgradation',
        eligibilityCriteria: 'Udyam-registered MSMEs',
        requiredDocuments: ['Udyam Registration', 'Project Report', 'CA Certificate'],
        applicationUrl: null,
        subsidyPct: null,
        maxAmountLakhs: null,
        notes: null,
        status: 'Active',
        netCapexMinLakhs: null,
        netCapexMaxLakhs: null,
      },
    ],
    bestNetCapexMinLakhs: 14,
    bestNetCapexMaxLakhs: 28,
  },
  {
    techId: 'T010',
    name: 'Waste Heat Recovery System (WHRS)',
    category: 'Sector Specific - Iron & Steel',
    reductionMinTonnes: 40,
    reductionMaxTonnes: 90,
    reductionMidTonnes: 65,
    energySavingMinGj: 200,
    energySavingMaxGj: 450,
    costSavingMinInr: 300000,
    costSavingMaxInr: 675000,
    capexMinLakhs: 30,
    capexMaxLakhs: 80,
    paybackMinYears: 3,
    paybackMaxYears: 6,
    paybackEstimateYears: 4.5,
    pctOfTotal: 8.1,
    matchedEmissionsTonnes: 480,
    matchedEnergyGj: 2400,
    scopeAddressed: 'Scope 1',
    technologyReadiness: 'Early commercial',
    demonstratedInIndia: true,
    description: 'Recover waste heat from EAF off-gas for preheating scrap or power generation',
    source: 'SAIL/RDCIS',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    fundingMatches: [
      {
        schemeId: 'S002',
        name: 'SIDBI CGTMSE',
        implementingAgency: 'SIDBI',
        supportType: 'Credit Guarantee covering 75–85% of sanctioned loan',
        financialDetails: 'Guarantee fee 1.5% p.a., covers loans up to Rs.5 Crore',
        eligibilityCriteria: 'Udyam-registered MSMEs with clean credit history',
        requiredDocuments: ['Udyam Registration', 'Last 2 years ITR', 'Loan Proposal', 'CMA Data'],
        applicationUrl: 'https://www.cgtmse.in/',
        subsidyPct: null,
        maxAmountLakhs: null,
        notes: 'Collateral-free loans enabled',
        status: 'Active',
        netCapexMinLakhs: null,
        netCapexMaxLakhs: null,
      },
    ],
    bestNetCapexMinLakhs: null,
    bestNetCapexMaxLakhs: null,
  },
  {
    techId: 'T008',
    name: 'PNG Pipeline Conversion',
    category: 'Alternative Fuels',
    reductionMinTonnes: 30,
    reductionMaxTonnes: 55,
    reductionMidTonnes: 42.5,
    energySavingMinGj: 50,
    energySavingMaxGj: 100,
    costSavingMinInr: 200000,
    costSavingMaxInr: 380000,
    capexMinLakhs: 8,
    capexMaxLakhs: 20,
    paybackMinYears: 2,
    paybackMaxYears: 4,
    paybackEstimateYears: 3.0,
    pctOfTotal: 5.3,
    matchedEmissionsTonnes: 320,
    matchedEnergyGj: 1600,
    scopeAddressed: 'Scope 1',
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    description: 'Switch from HSD/FO to piped natural gas for furnace heating',
    source: 'PNGRB',
    sourceUrl: null,
    warnings: ['Check CGD network availability in Nashik region'],
    reductionSteps: [],
    fundingMatches: [],
    bestNetCapexMinLakhs: null,
    bestNetCapexMaxLakhs: null,
  },
  {
    techId: 'T015',
    name: 'Scrap Preheating System',
    category: 'Sector Specific - Iron & Steel',
    reductionMinTonnes: 25,
    reductionMaxTonnes: 50,
    reductionMidTonnes: 37.5,
    energySavingMinGj: 130,
    energySavingMaxGj: 260,
    costSavingMinInr: 195000,
    costSavingMaxInr: 390000,
    capexMinLakhs: 15,
    capexMaxLakhs: 35,
    paybackMinYears: 2.5,
    paybackMaxYears: 5,
    paybackEstimateYears: 3.8,
    pctOfTotal: 4.7,
    matchedEmissionsTonnes: 480,
    matchedEnergyGj: 2400,
    scopeAddressed: 'Scope 1',
    technologyReadiness: 'Early commercial',
    demonstratedInIndia: true,
    description: 'Use EAF off-gas to preheat incoming steel scrap, reducing electrical energy for melting',
    source: 'UNDP-GEF Steel',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    fundingMatches: [
      {
        schemeId: 'S002',
        name: 'SIDBI CGTMSE',
        implementingAgency: 'SIDBI',
        supportType: 'Credit Guarantee covering 75–85% of sanctioned loan',
        financialDetails: 'Guarantee fee 1.5% p.a., covers loans up to Rs.5 Crore',
        eligibilityCriteria: 'Udyam-registered MSMEs',
        requiredDocuments: ['Udyam Registration', 'Last 2 years ITR', 'Loan Proposal'],
        applicationUrl: 'https://www.cgtmse.in/',
        subsidyPct: null,
        maxAmountLakhs: null,
        notes: null,
        status: 'Active',
        netCapexMinLakhs: null,
        netCapexMaxLakhs: null,
      },
    ],
    bestNetCapexMinLakhs: null,
    bestNetCapexMaxLakhs: null,
  },
];

// Build combined impact (sequential application)
const baselineTotal = 800;
const baselineScope1 = 520;
const baselineScope2 = 180;
const baselineScope3 = 100;

// Simulate sequential reduction
let residual = baselineTotal;
const sequence = [];
let totalCapexMin = 0, totalCapexMax = 0;
let totalSavingMin = 0, totalSavingMax = 0;

// Sort by payback
const sorted = [...recommendations].sort((a, b) => a.paybackMinYears - b.paybackMinYears);

for (const tech of sorted) {
  const midPct = tech.reductionMidTonnes / tech.matchedEmissionsTonnes;
  const residualFraction = residual / baselineTotal;
  const effectiveMatched = tech.matchedEmissionsTonnes * residualFraction;
  const reduction = effectiveMatched * midPct;
  residual -= reduction;
  if (residual < 0) residual = 0;

  sequence.push({
    techId: tech.techId,
    name: tech.name,
    reductionTonnes: reduction,
    residualAfterTonnes: residual,
  });

  totalCapexMin += tech.capexMinLakhs ?? 0;
  totalCapexMax += tech.capexMaxLakhs ?? 0;
  totalSavingMin += tech.costSavingMinInr * residualFraction;
  totalSavingMax += tech.costSavingMaxInr * residualFraction;
}

const totalReduction = baselineTotal - residual;
const combinedImpact = {
  baselineTotalTonnes: baselineTotal,
  baselineScope1Tonnes: baselineScope1,
  baselineScope2Tonnes: baselineScope2,
  baselineScope3Tonnes: baselineScope3,
  postReductionTotalTonnes: residual,
  totalReductionTonnes: totalReduction,
  totalReductionPct: (totalReduction / baselineTotal) * 100,
  totalCapexMinLakhs: totalCapexMin,
  totalCapexMaxLakhs: totalCapexMax,
  totalAnnualSavingMinInr: totalSavingMin,
  totalAnnualSavingMaxInr: totalSavingMax,
  blendedPaybackYears: ((totalCapexMin + totalCapexMax) / 2 * 100000) / ((totalSavingMin + totalSavingMax) / 2),
  technologySequence: sequence,
};

const data = { recommendations, notApplicable: [], combinedImpact };

// ── Generate PDF (same logic as reduction-plan-pdf.ts, adapted for Node) ──

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6;

function fmt(n, decimals = 1) {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

function addFooter(doc, pageNum) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by GHG Tool | ${new Date().toLocaleDateString('en-IN')}`, MARGIN, 285);
  doc.text(`Page ${pageNum}`, PAGE_WIDTH - MARGIN, 285, { align: 'right' });
}

function checkPage(doc, y, needed, pageNum) {
  if (y + needed > 270) {
    addFooter(doc, pageNum.val);
    doc.addPage();
    pageNum.val++;
    return MARGIN + 10;
  }
  return y;
}

const doc = new jsPDF();
const pageNum = { val: 1 };
const { recommendations: recs, combinedImpact: ci } = data;

// ── Title
doc.setFontSize(18);
doc.setTextColor(15, 23, 42);
doc.text('Emission Reduction Plan', MARGIN, 25);

doc.setFontSize(10);
doc.setTextColor(13, 118, 110);
doc.text('Rathi Steel Works Pvt. Ltd. — Nashik, Maharashtra', MARGIN, 33);

doc.setFontSize(9);
doc.setTextColor(100, 116, 139);
doc.text(`${recs.length} technologies matched · EAF + Re-Rolling Mill · Generated ${new Date().toLocaleDateString('en-IN')}`, MARGIN, 40);

// Separator
doc.setDrawColor(228, 228, 231);
doc.line(MARGIN, 44, MARGIN + CONTENT_WIDTH, 44);

// ── Impact Summary
let y = 52;
doc.setFontSize(13);
doc.setTextColor(15, 23, 42);
doc.text('Impact Summary', MARGIN, y);
y += 10;

// KPI boxes
const kpis = [
  { label: 'Baseline', value: `${fmt(ci.baselineTotalTonnes)} tCO2e`, color: [100, 116, 139] },
  { label: 'Reduction', value: `${fmt(ci.totalReductionTonnes)} tCO2e (${fmt(ci.totalReductionPct)}%)`, color: [5, 150, 105] },
  { label: 'Post-Reduction', value: `${fmt(ci.postReductionTotalTonnes)} tCO2e`, color: [15, 23, 42] },
  { label: 'Total CAPEX', value: `Rs.${fmt(ci.totalCapexMinLakhs, 0)}–${fmt(ci.totalCapexMaxLakhs, 0)} Lakhs`, color: [15, 23, 42] },
  { label: 'Annual Savings', value: `Rs.${fmt(ci.totalAnnualSavingMinInr / 100000, 0)}–${fmt(ci.totalAnnualSavingMaxInr / 100000, 0)} Lakhs`, color: [5, 150, 105] },
  { label: 'Blended Payback', value: ci.blendedPaybackYears != null ? `${fmt(ci.blendedPaybackYears)} years` : 'N/A', color: [15, 23, 42] },
];

for (const kpi of kpis) {
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(kpi.label, MARGIN, y);
  doc.setFontSize(10);
  doc.setTextColor(...kpi.color);
  doc.text(kpi.value, MARGIN + 35, y);
  y += 7;
}

// ── Technology Table
y += 6;
doc.setDrawColor(228, 228, 231);
doc.line(MARGIN, y - 3, MARGIN + CONTENT_WIDTH, y - 3);

doc.setFontSize(13);
doc.setTextColor(15, 23, 42);
doc.text('Technology Breakdown', MARGIN, y + 4);
y += 14;

// Header row with background
doc.setFillColor(241, 245, 249);
doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 7, 'F');
doc.setFontSize(7.5);
doc.setTextColor(100, 116, 139);
doc.text('Technology', MARGIN + 2, y);
doc.text('Category', MARGIN + 50, y);
doc.text('Reduction (tCO2e)', MARGIN + 93, y, { align: 'left' });
doc.text('CAPEX (Rs.L)', MARGIN + 125, y);
doc.text('Payback', MARGIN + 148, y);
y += 6;

doc.setDrawColor(228, 228, 231);
doc.line(MARGIN, y - 2.5, MARGIN + CONTENT_WIDTH, y - 2.5);

for (const tech of recs) {
  y = checkPage(doc, y, 8, pageNum);
  const name = tech.name.length > 26 ? tech.name.substring(0, 26) + '...' : tech.name;
  const cat = tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '');
  const shortCat = cat.length > 20 ? cat.substring(0, 20) + '...' : cat;

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(name, MARGIN + 2, y);
  doc.setTextColor(100, 116, 139);
  doc.text(shortCat, MARGIN + 50, y);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmt(tech.reductionMidTonnes)}`, MARGIN + 93, y);
  doc.text(
    tech.capexMinLakhs != null ? `${fmt(tech.capexMinLakhs, 0)}–${fmt(tech.capexMaxLakhs, 0)}` : 'N/A',
    MARGIN + 125, y,
  );
  doc.text(`${tech.paybackMinYears}–${tech.paybackMaxYears} yrs`, MARGIN + 148, y);

  // Light row separator
  doc.setDrawColor(240, 240, 240);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_WIDTH, y + 2);
  y += LINE_HEIGHT + 1;
}

// ── Sequential Waterfall
if (ci.technologySequence.length > 0) {
  y += 8;
  doc.setDrawColor(228, 228, 231);
  doc.line(MARGIN, y - 3, MARGIN + CONTENT_WIDTH, y - 3);

  y = checkPage(doc, y, 40, pageNum);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Reduction Sequence (Sequential Application)', MARGIN, y + 4);
  y += 8;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Reductions applied to residual emissions — sorted by payback period (quickest first)', MARGIN, y + 4);
  y += 10;

  // Baseline bar
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Baseline`, MARGIN, y + 1);
  doc.setFillColor(161, 161, 170);
  const barMaxWidth = 90;
  doc.rect(MARGIN + 45, y - 3, barMaxWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`${fmt(ci.baselineTotalTonnes)} tCO2e`, MARGIN + 47, y + 0.5);
  y += 8;

  for (let i = 0; i < ci.technologySequence.length; i++) {
    y = checkPage(doc, y, 10, pageNum);
    const step = ci.technologySequence[i];
    const barWidth = (step.residualAfterTonnes / ci.baselineTotalTonnes) * barMaxWidth;
    const reductionWidth = (step.reductionTonnes / ci.baselineTotalTonnes) * barMaxWidth;
    const name = step.name.length > 22 ? step.name.substring(0, 22) + '...' : step.name;

    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${i + 1}. ${name}`, MARGIN, y + 1);

    // Residual bar (grey)
    doc.setFillColor(212, 212, 216);
    doc.rect(MARGIN + 45, y - 3, barWidth, 5, 'F');

    // Reduction segment (teal)
    doc.setFillColor(45, 212, 191);
    doc.rect(MARGIN + 45 + barWidth, y - 3, reductionWidth, 5, 'F');

    // Label
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`-${fmt(step.reductionTonnes)} t >> ${fmt(step.residualAfterTonnes)} t`, MARGIN + 45 + barMaxWidth + 4, y + 1);
    y += 8;
  }
}

// ── Funding Summary
const allSchemes = new Map();
for (const tech of recs) {
  for (const fm of tech.fundingMatches) {
    if (!allSchemes.has(fm.schemeId)) {
      allSchemes.set(fm.schemeId, fm);
    }
  }
}

if (allSchemes.size > 0) {
  y += 6;
  doc.setDrawColor(228, 228, 231);
  doc.line(MARGIN, y - 3, MARGIN + CONTENT_WIDTH, y - 3);

  y = checkPage(doc, y, 25, pageNum);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Applicable Funding Schemes', MARGIN, y + 4);
  y += 12;

  for (const [, scheme] of allSchemes) {
    y = checkPage(doc, y, 16, pageNum);

    // Scheme card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 14, 2, 2, 'F');

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(scheme.name, MARGIN + 3, y);

    // Status badge
    if (scheme.status === 'Active') {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(MARGIN + CONTENT_WIDTH - 20, y - 3.5, 17, 5, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(4, 120, 87);
      doc.text('Active', MARGIN + CONTENT_WIDTH - 18, y);
    }

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${scheme.implementingAgency} · ${scheme.supportType}`, MARGIN + 3, y + 5);

    if (scheme.subsidyPct != null) {
      doc.setFontSize(7.5);
      doc.setTextColor(13, 118, 110);
      doc.text(`Subsidy: ${scheme.subsidyPct}%`, MARGIN + 3, y + 9.5);
    }

    y += 18;
  }
}

// ── Disclaimer
y += 4;
y = checkPage(doc, y, 12, pageNum);
doc.setDrawColor(228, 228, 231);
doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
y += 6;
doc.setFontSize(7);
doc.setTextColor(161, 161, 170);
doc.text('Disclaimer: Reduction estimates are indicative, based on sector benchmarks and technology specifications.', MARGIN, y);
doc.text('Actual savings depend on implementation, equipment sizing, operating conditions, and energy prices.', MARGIN, y + 4);
doc.text('Funding availability subject to scheme terms and government policies.', MARGIN, y + 8);

addFooter(doc, pageNum.val);

// Save to file
const pdfOutput = doc.output('arraybuffer');
const outputPath = new URL('../Emission-Reduction-Plan.pdf', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
writeFileSync(outputPath, Buffer.from(pdfOutput));
console.log(`\n✅ PDF generated: ${outputPath}`);
console.log(`\n── Summary ──`);
console.log(`Company: Rathi Steel Works Pvt. Ltd. (Nashik, MH)`);
console.log(`Type: EAF Mini-Mill + Re-Rolling`);
console.log(`Baseline: ${ci.baselineTotalTonnes} tCO2e/year`);
console.log(`Technologies matched: ${recs.length}`);
console.log(`Total reduction: ${fmt(ci.totalReductionTonnes)} tCO2e (${fmt(ci.totalReductionPct)}%)`);
console.log(`CAPEX range: Rs.${ci.totalCapexMinLakhs}–${ci.totalCapexMaxLakhs} Lakhs`);
console.log(`Blended payback: ${fmt(ci.blendedPaybackYears)} years`);
console.log(`Funding schemes: ${allSchemes.size}`);
