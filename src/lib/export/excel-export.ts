// ── Excel Export ───────────────────────────────────────────────────────────
// Generates a multi-sheet Excel workbook using the xlsx package.

import * as XLSX from 'xlsx';
import type { InventoryResult, BrsrOutput, CalculationRecord } from '@/lib/calc-engine/types';

interface ExcelExportData {
  organisation: { name: string; sector: string; state: string };
  period: { startDate: string; endDate: string };
  result: InventoryResult;
  brsr: BrsrOutput;
  methodology: string;
}

function fmt(n: number | null | undefined, decimals = 4): number | string {
  if (n == null) return 'N/A';
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function buildSummarySheet(data: ExcelExportData): XLSX.WorkSheet {
  const { organisation, period, result, brsr } = data;
  const rows = [
    ['GHG Inventory Report'],
    ['Organisation', organisation.name || 'Unnamed'],
    ['Sector', organisation.sector],
    ['State', organisation.state || '—'],
    ['Period', `${period.startDate || '—'} to ${period.endDate || '—'}`],
    ['Generated', new Date().toLocaleDateString('en-IN')],
    [],
    ['Emissions Summary'],
    ['Metric', 'Value', 'Unit'],
    ['Grand Total', fmt(result.grandTotal), 'tCO2e'],
    ['Scope 1 (Direct)', fmt(result.scope1.total), 'tCO2e'],
    ['Scope 2 (Electricity)', fmt(result.scope2Location.total), 'tCO2e'],
    ['Scope 3 (Value Chain)', fmt(result.scope3.total), 'tCO2e'],
    [],
    ['Energy & Intensity'],
    ['Total Energy Consumed', fmt(result.energyConsumedGj, 2), 'GJ'],
    ['Renewable Energy Share', fmt(result.renewablePercent, 2), '%'],
    ['Intensity per Turnover', fmt(brsr.intensityPerTurnover, 6), 'tCO2e/INR lakh'],
    ['Intensity per Product', fmt(brsr.intensityPerProduct, 6), 'tCO2e/tonne'],
    [],
    ['Data Quality'],
    ['Overall Score', result.dataQuality.overall, '/100'],
    ['Grade', result.dataQuality.grade],
    ['Primary Data Points', result.dataQuality.breakdown.primary],
    ['Secondary Data Points', result.dataQuality.breakdown.secondary],
    ['Estimated Data Points', result.dataQuality.breakdown.estimated],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 16 }];
  return ws;
}

function buildScopeSheet(
  records: CalculationRecord[],
  activityData: { id: string; sourceCategory: string; fuelType: string; description?: string; quantity?: number; unit?: string; spendInr?: number; dataQualityFlag: string }[],
): XLSX.WorkSheet {
  const header = [
    'Source Category',
    'Fuel/Activity',
    'Description',
    'Quantity',
    'Unit',
    'Spend (INR)',
    'Data Quality',
    'CO2 (t)',
    'CH4 CO2e (t)',
    'N2O CO2e (t)',
    'Total CO2e (t)',
    'EF Source',
    'EF Version',
    'GWP Report',
  ];

  const rows: (string | number | null)[][] = [header];

  for (const rec of records) {
    const ad = activityData.find((a) => a.id === rec.activityDataId);
    rows.push([
      ad?.sourceCategory ?? '—',
      ad?.fuelType ?? '—',
      ad?.description ?? '',
      ad?.quantity ?? null,
      ad?.unit ?? '',
      ad?.spendInr ?? null,
      ad?.dataQualityFlag ?? '',
      fmt(rec.co2Tonnes),
      fmt(rec.ch4Co2eTonnes),
      fmt(rec.n2oCo2eTonnes),
      fmt(rec.totalCo2eTonnes),
      rec.efSource,
      rec.efVersion ?? '',
      rec.gwpReport,
    ]);
  }

  if (rows.length === 1) {
    rows.push(['No data reported for this scope']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
  ];
  return ws;
}

function buildBrsrSheet(brsr: BrsrOutput): XLSX.WorkSheet {
  const rows = [
    ['BRSR Principle 6 Disclosure'],
    [],
    ['Field', 'Value'],
    ['Total Scope 1 Emissions (tCO2e)', fmt(brsr.scope1Total)],
    ['Total Scope 2 Emissions (tCO2e)', fmt(brsr.scope2Total)],
    ['Total Scope 3 Emissions (tCO2e)', fmt(brsr.scope3Total)],
    ['Intensity per Rupee of Turnover', fmt(brsr.intensityPerTurnover, 6)],
    ['Intensity per Unit of Product', fmt(brsr.intensityPerProduct, 6)],
    ['Total Energy Consumed (GJ)', fmt(brsr.totalEnergyGj, 2)],
    ['Renewable Energy (%)', fmt(brsr.renewablePercent, 2)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 40 }, { wch: 20 }];
  return ws;
}

function buildEfSheet(records: CalculationRecord[]): XLSX.WorkSheet {
  // Deduplicate by efId
  const seen = new Set<string>();
  const unique: { efId: string; efSource: string; efVersion: string | null; gwpReport: string }[] = [];

  for (const rec of records) {
    if (!seen.has(rec.efId)) {
      seen.add(rec.efId);
      unique.push({
        efId: rec.efId,
        efSource: rec.efSource,
        efVersion: rec.efVersion,
        gwpReport: rec.gwpReport,
      });
    }
  }

  const rows: (string | null)[][] = [
    ['EF ID', 'Source', 'Version', 'GWP Report'],
    ...unique.map((ef) => [ef.efId, ef.efSource, ef.efVersion, ef.gwpReport]),
  ];

  if (rows.length === 1) {
    rows.push(['No emission factors referenced']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 10 }];
  return ws;
}

export function generateExcelReport(data: ExcelExportData): void {
  const { result } = data;

  // Build activity data lookup from calculation records
  // We need to reconstruct a minimal activity data index.
  // The store has scope1Data/scope2Data/scope3Data but the export function
  // receives only the InventoryResult. We'll pass empty activity details
  // and rely on calculation records which contain the emissions data.
  const emptyActivity: { id: string; sourceCategory: string; fuelType: string; description: string; quantity: undefined; unit: string; spendInr: undefined; dataQualityFlag: string }[] = [];

  // Partition calculation records by looking at the scope totals.
  // Each CalculationRecord has an activityDataId but no scope field directly.
  // We match by: sum records per scope category to figure out which scope they belong to.
  // Build category-to-scope map from scope totals
  const catToScope = new Map<string, number>();
  for (const cat of result.scope1.categories) catToScope.set(cat.category, 1);
  for (const cat of result.scope2Location.categories) catToScope.set(cat.category, 2);
  for (const cat of result.scope3.categories) catToScope.set(cat.category, 3);

  // We can't perfectly partition without the original activity data, so we'll
  // put all records into a single detail sheet partitioned by scope using
  // the calculation steps (which reference the source category).
  // For simplicity, place all records in scope-specific sheets by looking at
  // the calculation steps for category hints, or just list them all.

  // Simple approach: all records on one sheet per scope, using efSource hints
  const scope1Records: CalculationRecord[] = [];
  const scope2Records: CalculationRecord[] = [];
  const scope3Records: CalculationRecord[] = [];

  // Use a heuristic: CEA grid EFs are Scope 2, most others split by category name
  for (const rec of result.calculations) {
    const steps = rec.calculationSteps;
    const hasGridEf = rec.efSource.toLowerCase().includes('cea') ||
      steps.some((s) => s.description.toLowerCase().includes('grid') || s.description.toLowerCase().includes('electricity'));

    if (hasGridEf) {
      scope2Records.push(rec);
    } else {
      // Check if any step mentions scope 3 categories
      const isScope3 = steps.some((s) =>
        s.description.toLowerCase().includes('scope 3') ||
        s.description.toLowerCase().includes('transport') ||
        s.description.toLowerCase().includes('waste') ||
        s.description.toLowerCase().includes('commut'),
      );
      if (isScope3) {
        scope3Records.push(rec);
      } else {
        scope1Records.push(rec);
      }
    }
  }

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(data), 'Summary');
  XLSX.utils.book_append_sheet(wb, buildScopeSheet(scope1Records, emptyActivity), 'Scope 1 Detail');
  XLSX.utils.book_append_sheet(wb, buildScopeSheet(scope2Records, emptyActivity), 'Scope 2 Detail');
  XLSX.utils.book_append_sheet(wb, buildScopeSheet(scope3Records, emptyActivity), 'Scope 3 Detail');
  XLSX.utils.book_append_sheet(wb, buildBrsrSheet(data.brsr), 'BRSR Format');
  XLSX.utils.book_append_sheet(wb, buildEfSheet(result.calculations), 'EF References');

  const filename = `GHG_Report_${(data.organisation.name || 'report').replace(/\s+/g, '_')}_${data.period.startDate || 'draft'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate a simple CSV export from the inventory result.
 * Downloads a CSV file with all calculation records.
 */
export function generateCsvExport(data: ExcelExportData): void {
  const { result, organisation, period } = data;

  const header = [
    'Activity ID',
    'CO2 (tonnes)',
    'CH4 CO2e (tonnes)',
    'N2O CO2e (tonnes)',
    'Total CO2e (tonnes)',
    'EF Source',
    'EF Version',
    'GWP Report',
  ];

  const rows = result.calculations.map((rec) =>
    [
      rec.activityDataId,
      rec.co2Tonnes.toFixed(4),
      rec.ch4Co2eTonnes.toFixed(4),
      rec.n2oCo2eTonnes.toFixed(4),
      rec.totalCo2eTonnes.toFixed(4),
      rec.efSource,
      rec.efVersion ?? '',
      rec.gwpReport,
    ].join(','),
  );

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `GHG_Data_${(organisation.name || 'export').replace(/\s+/g, '_')}_${period.startDate || 'draft'}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
