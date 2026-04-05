// ── Benchmark Methodology PDF Export ──────────────────────────────────────
// Generates a professional PDF of the benchmark methodology document.

import jsPDF from 'jspdf';

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5;

interface TableRow {
  cells: string[];
  isHeader?: boolean;
}

function addFooter(doc: jsPDF, pageNum: number) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('GHG Tool - Benchmark Methodology Document', MARGIN, 285);
  doc.text(`Page ${pageNum}`, PAGE_WIDTH - MARGIN, 285, { align: 'right' });
}

function checkPage(doc: jsPDF, y: number, needed: number, page: { n: number }): number {
  if (y + needed > 272) {
    addFooter(doc, page.n);
    doc.addPage();
    page.n++;
    return 30;
  }
  return y;
}

function heading1(doc: jsPDF, text: string, y: number, page: { n: number }): number {
  y = checkPage(doc, y, 14, page);
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);
  y += 3;
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  return y + 8;
}

function heading3(doc: jsPDF, text: string, y: number, page: { n: number }): number {
  y = checkPage(doc, y, 10, page);
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);
  return y + 6;
}

function bodyText(doc: jsPDF, text: string, y: number, page: { n: number }, indent = 0): number {
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
  for (const line of lines) {
    y = checkPage(doc, y, LINE_HEIGHT, page);
    doc.text(line, MARGIN + indent, y);
    y += LINE_HEIGHT;
  }
  return y;
}

function bulletPoint(doc: jsPDF, text: string, y: number, page: { n: number }, indent = 6): number {
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  y = checkPage(doc, y, LINE_HEIGHT, page);
  doc.text('-', MARGIN + indent, y);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent - 6);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) y = checkPage(doc, y, LINE_HEIGHT, page);
    doc.text(lines[i], MARGIN + indent + 5, y);
    if (i < lines.length - 1) y += LINE_HEIGHT;
  }
  return y + LINE_HEIGHT;
}

function labelValue(doc: jsPDF, label: string, value: string, y: number, page: { n: number }): number {
  y = checkPage(doc, y, LINE_HEIGHT, page);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text(label, MARGIN + 6, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  const valueLines = doc.splitTextToSize(value, CONTENT_WIDTH - 8);
  for (let i = 0; i < valueLines.length; i++) {
    if (i > 0) {
      y += LINE_HEIGHT;
      y = checkPage(doc, y, LINE_HEIGHT, page);
    }
    doc.text(valueLines[i], MARGIN + 8, y + LINE_HEIGHT);
  }
  return y + LINE_HEIGHT + 3;
}

function drawTable(doc: jsPDF, rows: TableRow[], colWidths: number[], y: number, page: { n: number }): number {
  const rowHeight = 7;

  for (const row of rows) {
    y = checkPage(doc, y, rowHeight + 2, page);
    let x = MARGIN;

    if (row.isHeader) {
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.rect(MARGIN, y - 5, CONTENT_WIDTH, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
    }

    for (let i = 0; i < row.cells.length; i++) {
      const cellText = doc.splitTextToSize(row.cells[i], colWidths[i] - 4);
      doc.text(cellText[0] || '', x + 2, y - 1);
      x += colWidths[i];
    }

    // Row border
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + 1, PAGE_WIDTH - MARGIN, y + 1);

    y += rowHeight;
  }
  return y + 2;
}

export function generateMethodologyPdf(): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const page = { n: 1 };
  let y = 30;

  // ── Title Page ──
  doc.setFontSize(22);
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('Sector Benchmark Methodology', MARGIN, y);
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('Indian Iron & Steel MSME Emission Intensity Benchmarks', MARGIN, y);
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text(`Version 1.0 | ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, MARGIN, y);
  y += 4;
  doc.text('Scope: Gate-to-gate (Scope 1 + Scope 2) emission intensity', MARGIN, y);
  y += 4;
  doc.text('All values in tCO2e per tonne of product', MARGIN, y);
  y += 12;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 12;

  // ── 1. General Methodology ──
  y = heading1(doc, '1. General Methodology', y, page);

  y = heading3(doc, 'Approach', y, page);
  y = bodyText(doc, 'Benchmarks are derived from India-specific studies, government data, and industry audits. Where published studies report energy consumption (SEC in kWh/t, kgoe/t, or fuel quantities), we convert to tCO2e/t using the following emission factors:', y, page);
  y += 2;

  y = drawTable(doc, [
    { cells: ['Parameter', 'Value', 'Source'], isHeader: true },
    { cells: ['Grid EF (national avg)', '0.710 tCO2/MWh', 'CEA v21.0 (FY2024-25)'] },
    { cells: ['Grid EF (Northern)', '0.898 tCO2/MWh', 'CEA v21.0'] },
    { cells: ['Grid EF (Southern)', '0.617 tCO2/MWh', 'CEA v21.0'] },
    { cells: ['Grid EF (Western)', '0.672 tCO2/MWh', 'CEA v21.0'] },
    { cells: ['Grid EF (Eastern)', '0.826 tCO2/MWh', 'CEA v21.0'] },
    { cells: ['Grid EF (Northeastern)', '0.476 tCO2/MWh', 'CEA v21.0'] },
    { cells: ['Furnace Oil EF', '3.15 tCO2/t FO', 'IPCC 2019 Refinement'] },
    { cells: ['Coal (Indian sub-bituminous)', '~2.6 tCO2/t', 'IPCC 2019 Refinement'] },
    { cells: ['Coke EF', '~3.0 tCO2/t', 'IPCC 2019 Refinement'] },
    { cells: ['GWP (AR5)', 'CH4=28, N2O=265', 'IPCC AR5 WG1'] },
  ], [60, 50, 60], y, page);
  y += 4;

  y = heading3(doc, 'Scope Boundary', y, page);
  y = bulletPoint(doc, 'Gate-to-gate only: Emissions from the specific manufacturing process (melting, reheating, forming). Does NOT include upstream raw material production.', y, page);
  y = bulletPoint(doc, 'Scope 1: Direct combustion of fuels (coal, furnace oil, coke, natural gas) and process emissions (electrode consumption, lime calcination).', y, page);
  y = bulletPoint(doc, 'Scope 2: Purchased grid electricity (location-based method using CEA regional factors).', y, page);
  y = bulletPoint(doc, 'Excludes: Scope 3 (upstream steel/scrap production, transport, waste).', y, page);
  y += 2;

  y = heading3(doc, 'Key Assumptions', y, page);
  y = bulletPoint(doc, 'All electricity-intensive processes use CEA v21.0 national weighted average grid EF (0.710 tCO2/MWh). Actual emissions vary by region (Northern: 0.898, Southern: 0.617).', y, page);
  y = bulletPoint(doc, 'Fuel mix for fuel-intensive processes assumes predominant use of furnace oil or coal, as typical of Indian MSMEs.', y, page);
  y = bulletPoint(doc, 'Foundry/casting benchmarks assume induction furnace melting (83% of Indian production).', y, page);
  y = bulletPoint(doc, '"Best Practice" = top decile Indian plant; "Average" = median Indian MSME; "Worst Quartile" = bottom 25th percentile.', y, page);
  y += 4;

  // ── Summary Table ──
  y = heading1(doc, '2. Summary of Benchmarks', y, page);

  y = drawTable(doc, [
    { cells: ['Sub-sector', 'Best Practice', 'Average', 'Worst Quartile', 'Primary Source'], isHeader: true },
    { cells: ['EAF Mini Mill', '0.32', '0.40', '0.52', 'SAMEEEKSHA/TERI'] },
    { cells: ['Induction Furnace', '0.42', '0.56', '0.72', 'BEE/SAMEEEKSHA'] },
    { cells: ['Re-Rolling Mill', '0.27', '0.44', '0.70', 'IspatGuru/BEE'] },
    { cells: ['Forging Unit', '0.46', '0.55', '0.65', 'UNIDO'] },
    { cells: ['Casting/Foundry (IF)', '0.58', '0.77', '1.04', 'BEE/PwC'] },
  ], [40, 28, 28, 28, 46], y, page);
  y += 2;
  y = bodyText(doc, 'All values in tCO2e per tonne of finished product.', y, page);
  y += 6;

  // ── 3. EAF Mini Mill ──
  y = heading1(doc, '3. EAF Mini Mill (Scrap-based)', y, page);

  y = drawTable(doc, [
    { cells: ['Metric', 'Best Practice', 'Average', 'Worst Quartile'], isHeader: true },
    { cells: ['tCO2e/t product', '0.32', '0.40', '0.52'] },
    { cells: ['kWh/t product', '400', '500', '650'] },
  ], [50, 40, 40, 40], y, page);
  y += 2;

  y = heading3(doc, 'Derivation', y, page);
  y = labelValue(doc, 'Scope 2 (Electricity):', 'SEC 400-650 kWh/t (EAF melting + ladle refining + continuous casting) x 0.000710 tCO2/kWh. Best: 400 x 0.000710 = 0.284; Avg: 500 x 0.000710 = 0.355; Worst: 650 x 0.000710 = 0.462 tCO2/t', y, page);
  y = labelValue(doc, 'Scope 1 (Fuel/Process):', 'Electrode consumption ~2-3 kg/t (0.007-0.010 tCO2/t); lime calcination ~20-30 kg/t (0.016-0.024 tCO2/t); oxy-fuel burner ~5-10 Nm3 NG/t (0.010-0.020 tCO2/t). Total Scope 1 add-on: 0.03-0.05 tCO2/t', y, page);

  y = heading3(doc, 'Sources', y, page);
  y = bulletPoint(doc, 'SAMEEEKSHA EAF Compendium (TERI/UNDP) — Pages 12-18: SEC benchmarking data. Table 2.1: Optimum SEC = 400 kWh/t. URL: sameeeksha.org/books/Electric-Arc-Furnace-Compendium.pdf', y, page);
  y = bulletPoint(doc, 'Ministry of Steel, Energy & Environment Management — 321 mini mills audited (UNDP-GEF project); 20-30% SEC reduction demonstrated. Data period: 2018-2022. URL: steel.gov.in', y, page);
  y += 4;

  // ── 4. Induction Furnace ──
  y = heading1(doc, '4. Induction Furnace (Scrap-based)', y, page);

  y = drawTable(doc, [
    { cells: ['Metric', 'Best Practice', 'Average', 'Worst Quartile'], isHeader: true },
    { cells: ['tCO2e/t product', '0.42', '0.56', '0.72'] },
    { cells: ['kWh/t product', '520', '680', '870'] },
  ], [50, 40, 40, 40], y, page);
  y += 2;

  y = heading3(doc, 'Derivation', y, page);
  y = labelValue(doc, 'Scope 2:', 'SEC 520-870 kWh/t (melting + holding + casting; IF lacks refining capability of EAF) x 0.000710. Best: 0.369; Avg: 0.483; Worst: 0.617 tCO2/t', y, page);
  y = labelValue(doc, 'Scope 1:', 'Ladle preheating (5-10 L FO/t = 0.015-0.030 tCO2/t); DG set backup (0.005-0.015 tCO2/t); lime additions (0.010-0.015 tCO2/t). Total: 0.03-0.08 tCO2/t', y, page);

  y = heading3(doc, 'Key Assumption', y, page);
  y = bulletPoint(doc, 'Scrap feed only. Coal DRI-IF route totals 2.30-3.1 tCO2/tcs including upstream DRI production (Source: CEEW).', y, page);

  y = heading3(doc, 'Sources', y, page);
  y = bulletPoint(doc, 'BEE/SAMEEEKSHA IF Cluster Profiles — Howrah, Mandi Gobindgarh, Raipur clusters: SEC 600-750 kWh/t typical. Optimum: 500 kWh/t. URL: sameeeksha.org', y, page);
  y = bulletPoint(doc, 'Coimbatore IF study (2016) — IF SEC = 650 kWh/t; 601.9 kgCO2/t at 0.926 grid EF. Recalculated: 650 x 0.710 = 461.5 kgCO2/t', y, page);
  y = bulletPoint(doc, 'Shakti Foundation/CSTEP — Energy Efficiency in Indian Iron & Steel, Section 4. URL: shaktifoundation.in', y, page);
  y += 4;

  // ── 5. Re-Rolling Mill ──
  y = heading1(doc, '5. Re-Rolling Mill', y, page);

  y = drawTable(doc, [
    { cells: ['Metric', 'Best Practice', 'Average', 'Worst Quartile'], isHeader: true },
    { cells: ['tCO2e/t product', '0.27', '0.44', '0.70'] },
  ], [50, 40, 40, 40], y, page);
  y += 2;

  y = heading3(doc, 'Derivation', y, page);
  y = labelValue(doc, 'Scope 1 (Reheating furnace):', 'Fuel SEC 80-200+ kgoe/t. Using weighted avg EF ~2.9 tCO2/toe: Best: 0.080 x 2.9 = 0.232; Avg: 0.130 x 2.9 = 0.377; Worst: 0.220 x 2.9 = 0.638 tCO2/t. Alt: coal consumption 226-269 kg/t x 2.6 = 0.59-0.70 tCO2/t', y, page);
  y = labelValue(doc, 'Scope 2 (Rolling drives):', '30-80 kWh/t x 0.000710. Best: 0.021; Avg: 0.039; Worst: 0.057 tCO2/t', y, page);

  y = heading3(doc, 'Key Assumptions', y, page);
  y = bulletPoint(doc, 'Wide range reflects difference between modern walking beam furnaces (45-55% efficiency) vs. old pusher-type coal-fired furnaces (20-30% efficiency).', y, page);
  y = bulletPoint(doc, 'Thermal benchmark: 270,000 kCal/t (BEE/UNDP). Theoretical minimum: 200,000 kCal/t (0.83 GJ/t).', y, page);

  y = heading3(doc, 'Sources', y, page);
  y = bulletPoint(doc, 'IspatGuru — Energy Management in Small & Medium Re-Rolling Mills. Benchmark SEC = 270,000 kCal/t; coal 226-269 kg/t. URL: ispatguru.com', y, page);
  y = bulletPoint(doc, 'Ministry of Steel — UNDP-GEF project: 34 model re-rolling mills, 25-50% SEC reduction. Data: 2015-2020', y, page);
  y = bulletPoint(doc, 'SAMEEEKSHA Re-Rolling Mill Cluster Profiles — Mandi Gobindgarh, Raipur. Thermal SEC: 1.5-3.8 GJ/t across 16 mills', y, page);
  y += 4;

  // ── 6. Forging Unit ──
  y = heading1(doc, '6. Forging Unit', y, page);

  y = drawTable(doc, [
    { cells: ['Metric', 'Best Practice', 'Average', 'Worst Quartile'], isHeader: true },
    { cells: ['tCO2e/t product', '0.46', '0.55', '0.65'] },
  ], [50, 40, 40, 40], y, page);
  y += 2;

  y = heading3(doc, 'Derivation', y, page);
  y = labelValue(doc, 'Scope 1 (Heating furnace):', 'FO consumption 0.14-0.18 L/kg product x 0.96 kg/L x 3.15 tCO2/t FO. Best: 0.423; Avg: 0.484; Worst: 0.544 tCO2/t', y, page);
  y = labelValue(doc, 'Scope 2 (Presses/hammers):', '40-80 kWh/t x 0.000710. Best: 0.028; Avg: 0.043; Worst: 0.057 tCO2/t', y, page);

  y = heading3(doc, 'Sources', y, page);
  y = bulletPoint(doc, 'UNIDO Eastern Zone Forging Cluster Technology Compendium — Pages 8-15: FO consumption 0.14-0.18 L/kg, 2021-2022 data', y, page);
  y = bulletPoint(doc, 'SAMEEEKSHA Pune Forging Cluster Profile — 200+ units; total 24,252 toe/yr; FO 50% share', y, page);
  y = bulletPoint(doc, 'BEE SIDHIEE Portal — Multiple forging cluster energy profiles. URL: sidhiee.beeindia.gov.in/ClusterDetails', y, page);
  y += 4;

  // ── 7. Casting / Foundry ──
  y = heading1(doc, '7. Casting / Foundry (IF-based)', y, page);

  y = drawTable(doc, [
    { cells: ['Metric', 'Best Practice', 'Average', 'Worst Quartile'], isHeader: true },
    { cells: ['tCO2e/t product', '0.58', '0.77', '1.04'] },
  ], [50, 40, 40, 40], y, page);
  y += 2;

  y = heading3(doc, 'Derivation', y, page);
  y = labelValue(doc, 'Scope 2:', 'Liquid metal SEC 550-850 kWh/t, adjusted for yield loss (55-70%): effective 786-1545 kWh/t product x 0.000710. Best: 0.558; Avg: 0.710; Worst: 0.970 tCO2/t', y, page);
  y = labelValue(doc, 'Scope 1:', 'Sand preparation, mould drying, heat treatment: 0.02-0.07 tCO2/t', y, page);

  y = heading3(doc, 'Key Assumptions', y, page);
  y = bulletPoint(doc, 'IF-based foundries (83% of Indian production). Cupola foundries using coke have different profiles (~0.35-0.55 tCO2/t).', y, page);
  y = bulletPoint(doc, 'Yield loss is the biggest factor: investment castings 50-55% yield vs. sand castings 65-70% yield.', y, page);
  y = bulletPoint(doc, 'Does NOT include upstream metal production. For foundries buying pig iron, add ~2.0-2.5 tCO2/t for Scope 3.', y, page);

  y = heading3(doc, 'Sources', y, page);
  y = bulletPoint(doc, 'BEE Foundry Sector Energy Mapping (PwC) — Pages 24-38: IF SEC 600-750 kWh/t liquid metal. URL: beeindia.gov.in', y, page);
  y = bulletPoint(doc, 'Coimbatore Cupola vs IF Study (2016) — IF: 650 kWh/t = 601.9 kgCO2/t at 0.926 EF; recalculated to 461.5 at 0.710', y, page);
  y = bulletPoint(doc, 'SAMEEEKSHA Rajkot Investment Castings Profile — SEC up to 2000 kWh/t finished product (low yield)', y, page);
  y += 4;

  // ── 8. Limitations ──
  y = heading1(doc, '8. Limitations & Caveats', y, page);

  y = bulletPoint(doc, 'No single authoritative India MSME steel benchmark document exists. Values are synthesised from multiple sources spanning 2016-2023.', y, page);
  y = bulletPoint(doc, 'Regional grid variation: Southern (0.617) vs. Northern (0.898) creates 45% variance in Scope 2 for the same energy consumption. Benchmarks use national average.', y, page);
  y = bulletPoint(doc, 'DRI-IF route excluded: IF benchmarks assume scrap feed. Coal DRI-IF totals 2.30-3.1 tCO2/tcs including upstream (Source: CEEW).', y, page);
  y = bulletPoint(doc, 'PAT scheme gap: BEE PAT covers designated consumers (>20,000 toe/yr). Most MSMEs fall below this threshold.', y, page);
  y = bulletPoint(doc, 'Self-generation: MSMEs using DG sets for backup would have higher Scope 1 than these benchmarks.', y, page);
  y = bulletPoint(doc, 'Fuel switching: Some mills moving from FO to PNG, which reduces emission intensity by ~25-30%.', y, page);

  addFooter(doc, page.n);
  return doc.output('arraybuffer');
}
