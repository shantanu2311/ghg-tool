// ── Word Export ────────────────────────────────────────────────────────────
// Generates a BRSR-formatted Word document using the docx npm package.

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
import type { InventoryResult, BrsrOutput } from '@/lib/calc-engine/types';

interface WordExportData {
  organisation: { name: string; sector: string; state: string };
  period: { startDate: string; endDate: string };
  result: InventoryResult;
  brsr: BrsrOutput;
  methodology: string;
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

const BORDER_LIGHT = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
} as const;

const HEADER_SHADING = {
  type: ShadingType.SOLID,
  color: 'F3F4F6',
  fill: 'F3F4F6',
} as const;

function makeHeaderCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, font: 'Calibri' })],
      }),
    ],
    borders: BORDER_LIGHT,
    shading: HEADER_SHADING,
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function makeCell(text: string, options?: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; width?: number }): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: options?.bold ?? false,
            size: 18,
            font: 'Calibri',
          }),
        ],
        alignment: options?.alignment ?? AlignmentType.LEFT,
      }),
    ],
    borders: BORDER_LIGHT,
    ...(options?.width ? { width: { size: options.width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function make2ColTable(rows: [string, string][], headerRow?: [string, string]): Table {
  const tableRows: TableRow[] = [];

  if (headerRow) {
    tableRows.push(
      new TableRow({
        children: [makeHeaderCell(headerRow[0], 60), makeHeaderCell(headerRow[1], 40)],
      }),
    );
  }

  for (const [label, value] of rows) {
    tableRows.push(
      new TableRow({
        children: [
          makeCell(label, { width: 60 }),
          makeCell(value, { alignment: AlignmentType.RIGHT, width: 40 }),
        ],
      }),
    );
  }

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function make3ColTable(rows: [string, string, string][], header: [string, string, string]): Table {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [makeHeaderCell(header[0], 50), makeHeaderCell(header[1], 25), makeHeaderCell(header[2], 25)],
    }),
  ];

  for (const [a, b, c] of rows) {
    tableRows.push(
      new TableRow({
        children: [
          makeCell(a, { width: 50 }),
          makeCell(b, { alignment: AlignmentType.RIGHT, width: 25 }),
          makeCell(c, { alignment: AlignmentType.RIGHT, width: 25 }),
        ],
      }),
    );
  }

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 100 } });
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { after: 100 } });
}

export async function generateWordReport(data: WordExportData): Promise<void> {
  const { organisation, period, result, brsr, methodology } = data;
  const dateStr = new Date().toLocaleDateString('en-IN');

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children: [
          // ── Title ──────────────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: 'GHG Inventory Report',
                bold: true,
                size: 36,
                font: 'Calibri',
                color: '1E1E1E',
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'BRSR Principle 6 Disclosure',
                size: 22,
                font: 'Calibri',
                color: '6366F1',
              }),
            ],
            spacing: { after: 200 },
          }),

          // ── Organisation Details ───────────────────────────────────
          make2ColTable(
            [
              ['Organisation', organisation.name || 'Unnamed'],
              ['Sector', organisation.sector],
              ['State', organisation.state || '—'],
              ['Period', `${period.startDate || '—'} to ${period.endDate || '—'}`],
              ['Report Generated', dateStr],
            ],
            ['Detail', 'Value'],
          ),
          spacer(),

          // ── Section 1: Executive Summary ───────────────────────────
          heading('1. Executive Summary'),
          make2ColTable([
            ['Grand Total Emissions', `${fmt(result.grandTotal, 4)} tCO2e`],
            ['Scope 1 (Direct)', `${fmt(result.scope1.total, 4)} tCO2e`],
            ['Scope 2 (Electricity)', `${fmt(result.scope2Location.total, 4)} tCO2e`],
            ['Scope 3 (Value Chain)', `${fmt(result.scope3.total, 4)} tCO2e`],
            ['Total Energy Consumed', `${fmt(result.energyConsumedGj)} GJ`],
            ['Renewable Energy Share', `${fmt(result.renewablePercent)}%`],
          ]),
          spacer(),

          // ── Section 2: BRSR Fields ─────────────────────────────────
          heading('2. BRSR Principle 6 Disclosure'),
          make2ColTable(
            [
              ['Total Scope 1 Emissions (tCO2e)', fmt(brsr.scope1Total, 4)],
              ['Total Scope 2 Emissions (tCO2e)', fmt(brsr.scope2Total, 4)],
              ['Total Scope 3 Emissions (tCO2e)', fmt(brsr.scope3Total, 4)],
              ['Intensity per Rupee of Turnover', fmt(brsr.intensityPerTurnover, 6)],
              ['Intensity per Unit of Product', fmt(brsr.intensityPerProduct, 6)],
              ['Total Energy Consumed (GJ)', fmt(brsr.totalEnergyGj, 2)],
              ['Renewable Energy (%)', fmt(brsr.renewablePercent, 2)],
            ],
            ['BRSR Field', 'Value'],
          ),
          spacer(),

          // ── Section 3: Scope Breakdown ─────────────────────────────
          heading('3. Emission Breakdown by Scope'),
          ...[
            { label: 'Scope 1', data: result.scope1 },
            { label: 'Scope 2', data: result.scope2Location },
            { label: 'Scope 3', data: result.scope3 },
          ].flatMap((scope) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${scope.label}: `, bold: true, size: 20, font: 'Calibri' }),
                new TextRun({ text: `${fmt(scope.data.total, 4)} tCO2e`, size: 20, font: 'Calibri' }),
              ],
              spacing: { before: 100, after: 60 },
            }),
            ...(scope.data.categories.length > 0
              ? [
                  make2ColTable(
                    scope.data.categories.map((c) => [c.category, `${fmt(c.total, 4)} tCO2e`] as [string, string]),
                    ['Category', 'Emissions (tCO2e)'],
                  ),
                ]
              : [new Paragraph({ text: 'No categories reported.', spacing: { after: 60 } })]),
          ]),
          spacer(),

          // ── Section 4: Top Sources ─────────────────────────────────
          heading('4. Top Emission Sources'),
          make3ColTable(
            result.topSources.slice(0, 5).map((s) => [s.source, fmt(s.co2e, 4), `${fmt(s.percent, 1)}%`] as [string, string, string]),
            ['Source', 'CO2e (t)', '% of Total'],
          ),
          spacer(),

          // ── Section 5: Data Quality ────────────────────────────────
          heading('5. Data Quality Assessment'),
          new Paragraph({
            children: [
              new TextRun({ text: `Score: ${result.dataQuality.overall}/100 `, bold: true, size: 20, font: 'Calibri' }),
              new TextRun({ text: `(${result.dataQuality.grade})`, size: 20, font: 'Calibri', color: '6366F1' }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Primary: ${result.dataQuality.breakdown.primary} | Secondary: ${result.dataQuality.breakdown.secondary} | Estimated: ${result.dataQuality.breakdown.estimated}`,
                size: 18,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 100 },
          }),
          ...(result.dataQuality.recommendations.length > 0
            ? [
                new Paragraph({
                  children: [new TextRun({ text: 'Recommendations:', bold: true, size: 18, font: 'Calibri' })],
                  spacing: { after: 40 },
                }),
                ...result.dataQuality.recommendations.map(
                  (rec) =>
                    new Paragraph({
                      children: [new TextRun({ text: `  - ${rec}`, size: 18, font: 'Calibri' })],
                      spacing: { after: 20 },
                    }),
                ),
              ]
            : []),
          spacer(),

          // ── Section 6: Cross-Check Warnings ────────────────────────
          ...(result.crossCheckWarnings.length > 0
            ? [
                heading('6. Cross-Check Results'),
                ...result.crossCheckWarnings.map(
                  (w) =>
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `[${w.severity.toUpperCase()}] `,
                          bold: true,
                          size: 18,
                          font: 'Calibri',
                          color: w.severity === 'error' ? 'DC2626' : w.severity === 'warning' ? 'D97706' : '6B7280',
                        }),
                        new TextRun({ text: w.message, size: 18, font: 'Calibri' }),
                      ],
                      spacing: { after: 40 },
                    }),
                ),
                spacer(),
              ]
            : []),

          // ── Section 7: Methodology ─────────────────────────────────
          heading(result.crossCheckWarnings.length > 0 ? '7. Methodology Note' : '6. Methodology Note'),
          ...methodology.split('\n').map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, size: 18, font: 'Calibri', color: '4B5563' })],
                spacing: { after: 40 },
              }),
          ),
          spacer(),

          // ── Footer ─────────────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated by GHG Tool | ${dateStr}`,
                size: 14,
                font: 'Calibri',
                color: '9CA3AF',
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const filename = `GHG_Report_${(organisation.name || 'report').replace(/\s+/g, '_')}_${period.startDate || 'draft'}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
