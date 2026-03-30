// ── Reduction Plan Word Export ─────────────────────────────────────────────
// Generates a Word document summary of emission reduction recommendations.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import type { RecommendationResult } from '@/lib/rec-engine/types';

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
} as const;

const HEADER_SHADING = { fill: 'F1F5F9', type: ShadingType.CLEAR, color: 'auto' } as const;

function cell(text: string, opts?: { bold?: boolean; header?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; width?: number }) {
  return new TableCell({
    borders: BORDER,
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts?.header ? HEADER_SHADING : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts?.bold ?? opts?.header ?? false, size: 18, font: 'Arial' })],
      }),
    ],
  });
}

export async function generateReductionPlanWord(data: RecommendationResult) {
  const { recommendations, combinedImpact: ci } = data;

  const sectionChildren: (Paragraph | Table)[] = [];

  // Title
  sectionChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Emission Reduction Plan', bold: true, size: 32, font: 'Arial' })],
    }),
  );

  sectionChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `${recommendations.length} technologies matched · Generated ${new Date().toLocaleDateString('en-IN')}`,
          size: 18,
          color: '64748B',
          font: 'Arial',
        }),
      ],
    }),
  );

  // Impact Summary
  sectionChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: 'Impact Summary', bold: true, size: 24, font: 'Arial' })],
    }),
  );

  const summaryLines = [
    `Baseline Emissions: ${fmt(ci.baselineTotalTonnes)} tCO2e/year`,
    `Potential Reduction: ${fmt(ci.totalReductionTonnes)} tCO2e/year (${fmt(ci.totalReductionPct)}%)`,
    `Post-Reduction: ${fmt(ci.postReductionTotalTonnes)} tCO2e/year`,
    `Total CAPEX: ₹${fmt(ci.totalCapexMinLakhs, 0)}–${fmt(ci.totalCapexMaxLakhs, 0)} Lakhs`,
    `Annual Savings: ₹${fmt(ci.totalAnnualSavingMinInr / 100000, 0)}–${fmt(ci.totalAnnualSavingMaxInr / 100000, 0)} Lakhs`,
    `Blended Payback: ${ci.blendedPaybackYears != null ? `${fmt(ci.blendedPaybackYears)} years` : 'N/A'}`,
  ];

  for (const line of summaryLines) {
    sectionChildren.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: line, size: 20, font: 'Arial' })],
      }),
    );
  }

  // Technology Table
  sectionChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: 'Technology Breakdown', bold: true, size: 24, font: 'Arial' })],
    }),
  );

  const techTable = new Table({
    width: { size: 8360, type: WidthType.DXA },
    columnWidths: [2800, 1800, 1500, 1200, 1060],
    rows: [
      new TableRow({
        children: [
          cell('Technology', { header: true, width: 2800 }),
          cell('Category', { header: true, width: 1800 }),
          cell('Reduction (tCO2e)', { header: true, align: AlignmentType.RIGHT, width: 1500 }),
          cell('CAPEX (₹L)', { header: true, align: AlignmentType.RIGHT, width: 1200 }),
          cell('Payback', { header: true, align: AlignmentType.RIGHT, width: 1060 }),
        ],
      }),
      ...recommendations.map(
        (tech) =>
          new TableRow({
            children: [
              cell(tech.name, { width: 2800 }),
              cell(tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', ''), { width: 1800 }),
              cell(fmt(tech.reductionMidTonnes), { align: AlignmentType.RIGHT, width: 1500 }),
              cell(tech.capexMinLakhs != null ? `${fmt(tech.capexMinLakhs, 0)}–${fmt(tech.capexMaxLakhs, 0)}` : 'N/A', { align: AlignmentType.RIGHT, width: 1200 }),
              cell(`${tech.paybackMinYears}–${tech.paybackMaxYears} yrs`, { align: AlignmentType.RIGHT, width: 1060 }),
            ],
          }),
      ),
    ],
  });

  sectionChildren.push(techTable);

  // Sequential waterfall
  if (ci.technologySequence.length > 0) {
    sectionChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: 'Reduction Sequence', bold: true, size: 24, font: 'Arial' })],
      }),
    );

    sectionChildren.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Technologies applied sequentially to residual emissions', size: 18, color: '64748B', font: 'Arial' }),
        ],
      }),
    );

    sectionChildren.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: `Baseline: ${fmt(ci.baselineTotalTonnes)} tCO2e`, bold: true, size: 20, font: 'Arial' })],
      }),
    );

    for (let i = 0; i < ci.technologySequence.length; i++) {
      const step = ci.technologySequence[i];
      sectionChildren.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${i + 1}. ${step.name}`, bold: true, size: 18, font: 'Arial' }),
            new TextRun({ text: `  −${fmt(step.reductionTonnes)} t  →  ${fmt(step.residualAfterTonnes)} t remaining`, size: 18, font: 'Arial', color: '64748B' }),
          ],
        }),
      );
    }
  }

  // Funding
  const allSchemes = new Map<string, { name: string; agency: string; subsidy: number | null; support: string }>();
  for (const tech of recommendations) {
    for (const fm of tech.fundingMatches) {
      if (!allSchemes.has(fm.schemeId)) {
        allSchemes.set(fm.schemeId, { name: fm.name, agency: fm.implementingAgency, subsidy: fm.subsidyPct, support: fm.supportType });
      }
    }
  }

  if (allSchemes.size > 0) {
    sectionChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: 'Applicable Funding Schemes', bold: true, size: 24, font: 'Arial' })],
      }),
    );

    for (const [, scheme] of allSchemes) {
      sectionChildren.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: scheme.name, bold: true, size: 20, font: 'Arial' }),
            new TextRun({ text: ` — ${scheme.agency}`, size: 18, font: 'Arial', color: '64748B' }),
          ],
        }),
      );
      const details = [scheme.support];
      if (scheme.subsidy != null) details.push(`Subsidy: ${scheme.subsidy}%`);
      sectionChildren.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: details.join(' · '), size: 18, font: 'Arial', color: '475569' })],
        }),
      );
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: sectionChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Emission-Reduction-Plan.docx';
  a.click();
  URL.revokeObjectURL(url);
}
