// ── Source Audit Spreadsheet Generator ──────────────────────────────────────
// Generates data/source-audit.xlsx with every data point mapped to its source.
// Run: npx tsx data/generate-audit.ts

import XLSX from 'xlsx';
import path from 'path';

// ── Fuel Properties (IPCC 2006 Vol 2) ──────────────────────────────────────

const fuelPropertyAudit = [
  ['Fuel Code', 'Property', 'Value', 'Unit', 'Source Document', 'Table/Section', 'URL', 'Notes'],
  ['DIESEL_HSD', 'NCV', 43.0, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Gas/Diesel Oil)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'Default NCV for Gas/Diesel Oil'],
  ['DIESEL_HSD', 'CO2 EF', 74100, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Gas/Diesel Oil)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['DIESEL_HSD', 'Density', 0.832, 'tonne/kL', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 footnotes', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['DIESEL_HSD', 'CH4 EF (Mfg)', 10, 'kgCH4/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Liquid)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', 'Table 2.2 (Energy Industries) has CH4=3'],
  ['DIESEL_HSD', 'N2O EF (Mfg)', 0.6, 'kgN2O/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Liquid)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', ''],

  ['PETROL_MS', 'NCV', 44.3, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Motor Gasoline)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['PETROL_MS', 'CO2 EF', 69300, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Motor Gasoline)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['PETROL_MS', 'Density', 0.745, 'tonne/kL', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 footnotes', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],

  ['LPG', 'NCV', 47.3, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (LPG)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['LPG', 'CO2 EF', 63100, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (LPG)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['LPG', 'Density', 0.54, 'tonne/kL', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['LPG', 'CH4 EF (Mfg)', 5, 'kgCH4/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Gaseous)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', 'LPG classified as gaseous fuel in Table 2.3'],
  ['LPG', 'N2O EF (Mfg)', 0.1, 'kgN2O/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Gaseous)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', ''],

  ['NATURAL_GAS', 'NCV', 48.0, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Natural Gas)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['NATURAL_GAS', 'CO2 EF', 56100, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Natural Gas)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['NATURAL_GAS', 'Density', 0.74, 'kg/m3', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['NATURAL_GAS', 'CH4 EF (Mfg)', 5, 'kgCH4/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Gaseous)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', ''],

  ['COAL_INDIAN', 'NCV', 18.9, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Sub-Bituminous Coal)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'Indian coal predominantly sub-bituminous'],
  ['COAL_INDIAN', 'CO2 EF', 96100, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Sub-Bituminous Coal)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['COAL_INDIAN', 'CH4 EF (Mfg)', 10, 'kgCH4/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Solid)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', 'Table 2.2 has CH4=1 for Energy Industries — different!'],
  ['COAL_INDIAN', 'N2O EF (Mfg)', 1.5, 'kgN2O/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Solid)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', ''],

  ['COKING_COAL', 'NCV', 28.2, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Coking Coal)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['COKING_COAL', 'CO2 EF', 94600, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Coking Coal)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],

  ['COKE', 'NCV', 28.2, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Coke Oven Coke)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['COKE', 'CO2 EF', 107000, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Coke Oven Coke)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'Highest carbon intensity among coal products'],

  ['FURNACE_OIL', 'NCV', 40.4, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Residual Fuel Oil)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['FURNACE_OIL', 'CO2 EF', 77400, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Residual Fuel Oil)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['FURNACE_OIL', 'Density', 0.95, 'tonne/kL', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],

  ['BIOMASS_WOOD', 'NCV', 15.6, 'TJ/Gg', 'IPCC 2006 Guidelines Vol 2', 'Table 1.2 (Wood/Wood Waste)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', ''],
  ['BIOMASS_WOOD', 'CO2 EF', 112000, 'kgCO2/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 1.4 (Wood/Wood Waste)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html', 'BIOGENIC — reported separately per GHG Protocol'],
  ['BIOMASS_WOOD', 'CH4 EF (Mfg)', 30, 'kgCH4/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Biomass)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', 'Biomass CH4/N2O ARE included in Scope 1'],
  ['BIOMASS_WOOD', 'N2O EF (Mfg)', 4, 'kgN2O/TJ', 'IPCC 2006 Guidelines Vol 2', 'Table 2.3 (Manufacturing, Biomass)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf', ''],
];

// ── GWP Values ─────────────────────────────────────────────────────────────

const gwpAudit = [
  ['Gas', 'GWP (100-yr)', 'Assessment Report', 'Source Document', 'Table/Section', 'URL', 'Notes'],
  ['CO2', 1, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', 'Reference gas'],
  ['CH4', 28, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', 'Without climate-carbon feedback'],
  ['N2O', 265, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', ''],
  ['SF6', 23500, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', ''],
  ['HCFC-22 (R22)', 1760, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', 'NOTE: AR4 value was 1810 — different!'],
  ['HFC-134a', 1300, 'AR5', 'IPCC AR5 WG1', 'Table 8.A.1', 'https://www.ipcc.ch/report/ar5/wg1/', 'NOTE: AR4 value was 1430 — different!'],
  ['CO2', 1, 'AR6', 'IPCC AR6 WG1', 'Table 7.15', 'https://www.ipcc.ch/report/ar6/wg1/', ''],
  ['CH4', 27.9, 'AR6', 'IPCC AR6 WG1', 'Table 7.15', 'https://www.ipcc.ch/report/ar6/wg1/', 'Fossil=29.8, Biogenic=27.0, blended~27.9'],
  ['N2O', 273, 'AR6', 'IPCC AR6 WG1', 'Table 7.15', 'https://www.ipcc.ch/report/ar6/wg1/', ''],
  ['SF6', 24300, 'AR6', 'IPCC AR6 WG1', 'Table 7.15', 'https://www.ipcc.ch/report/ar6/wg1/', ''],
];

// ── Grid Emission Factor ───────────────────────────────────────────────────

const gridAudit = [
  ['Region', 'EF (tCO2/MWh)', 'Source', 'Version', 'Period', 'URL', 'Notes'],
  ['National (Weighted Avg)', 0.710, 'CEA CO2 Baseline Database', 'Version 21.0', 'FY2024-25', 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf', 'India operates as one unified grid since 2013. Regional breakdowns are legacy classifications.'],
];

// ── Process Emission Factors ───────────────────────────────────────────────

const processAudit = [
  ['Process/Material', 'EF Value', 'Unit', 'Source Document', 'Table/Section', 'URL', 'Notes'],
  ['EAF Steelmaking (Tier 1)', 0.08, 'tCO2/t steel', 'IPCC 2006 Vol 3', 'Ch 4 Table 4.1 (EAF Steel)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_4_Ch4_Metal_Industry.pdf', 'Default Tier 1 for EAF process emissions'],
  ['Graphite Electrode', 3.667, 'kgCO2/kg electrode', 'Stoichiometric calculation', 'C + O2 → CO2; 44/12 = 3.667', '', 'Pure carbon oxidation. For Tier 2 method.'],
  ['Limestone (CaCO3)', 0.440, 'tCO2/tonne', 'IPCC 2006 Vol 3', 'Ch 2 Table 2.1 (Limestone)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf', 'CaCO3 → CaO + CO2'],
  ['Dolomite (CaMg(CO3)2)', 0.477, 'tCO2/tonne', 'IPCC 2006 Vol 3', 'Ch 2 Table 2.1 (Dolomite)', 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf', 'CaMg(CO3)2 decomposition'],
];

// ── Scope 3 EFs ────────────────────────────────────────────────────────────

const scope3Audit = [
  ['Activity', 'EF Value', 'Unit', 'Source', 'Category', 'URL', 'Notes'],
  ['Scrap Steel (recycled)', 0.43, 'tCO2e/tonne', 'DEFRA UK GHG Conversion Factors 2024', 'Material Use', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Lifecycle EF for recycled steel'],
  ['Iron Ore', 0.04, 'tCO2e/tonne', 'DEFRA UK GHG Conversion Factors 2024', 'Material Use', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Mining & processing'],
  ['Ferroalloy', 5.0, 'tCO2e/tonne', 'DEFRA UK GHG Conversion Factors 2024', 'Metals', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'High energy intensity'],
  ['Road Freight (HGV)', 0.10726, 'kgCO2e/tonne-km', 'DEFRA UK GHG Conversion Factors 2024', 'Freighting Goods', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'All diesel average laden'],
  ['Rail Freight', 0.02455, 'kgCO2e/tonne-km', 'DEFRA UK GHG Conversion Factors 2024', 'Freighting Goods', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', ''],
  ['Waste to Landfill', 0.586, 'tCO2e/tonne', 'DEFRA UK GHG Conversion Factors 2024', 'Waste Disposal', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Commercial/industrial mixed waste'],
  ['Waste Recycled', 0.021, 'tCO2e/tonne', 'DEFRA UK GHG Conversion Factors 2024', 'Waste Disposal', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Mixed recycling'],
  ['Travel by Car', 0.17148, 'kgCO2e/km', 'DEFRA UK GHG Conversion Factors 2024', 'Business Travel', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Average car'],
  ['Travel by Rail', 0.03549, 'kgCO2e/km', 'DEFRA UK GHG Conversion Factors 2024', 'Business Travel', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'National rail'],
  ['Travel by Air (Domestic)', 0.24587, 'kgCO2e/km', 'DEFRA UK GHG Conversion Factors 2024', 'Business Travel', 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024', 'Includes radiative forcing'],
];

// ── Sector Benchmarks ──────────────────────────────────────────────────────

const benchmarkAudit = [
  ['Sub-Sector', 'Metric', 'Best Practice', 'Sector Avg', 'Worst Quartile', 'Source', 'URL', 'Year'],
  ['EAF Mini Mill', 'tCO2e/tonne', 0.4, 0.45, 0.55, 'Worldsteel / IEA Iron & Steel Roadmap', 'https://www.iea.org/reports/iron-and-steel-technology-roadmap', 2020],
  ['Induction Furnace', 'tCO2e/tonne', 0.6, 0.75, 0.9, 'BEE PAT Scheme / Worldsteel', 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade', 2022],
  ['Re-Rolling', 'tCO2e/tonne', 0.15, 0.28, 0.40, 'BEE PAT Scheme', 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade', 2022],
  ['Forging', 'tCO2e/tonne', 0.3, 0.45, 0.6, 'BEE PAT Scheme / Industry estimates', 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade', 2022],
  ['Casting/Foundry', 'tCO2e/tonne', 0.5, 0.65, 0.8, 'BEE PAT Scheme / Industry estimates', 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade', 2022],
  ['EAF Mini Mill', 'kWh/tonne', 400, 550, 700, 'Worldsteel / IEA Iron & Steel Roadmap', 'https://www.iea.org/reports/iron-and-steel-technology-roadmap', 2020],
];

// ── Data Corrections (vs Blueprint) ────────────────────────────────────────

const correctionsAudit = [
  ['Blueprint Value', 'Corrected Value', 'Field', 'Reason', 'Source'],
  ['NCV Diesel: 43.33 TJ/Gg', 'NCV Diesel: 43.0 TJ/Gg', 'FuelProperty.ncvTjPerGg', 'Blueprint used non-standard value. IPCC 2006 Vol 2 Table 1.2 gives 43.0 for Gas/Diesel Oil', 'IPCC 2006 Vol 2 Table 1.2'],
  ['CEA Grid: 0.708 tCO2/MWh', 'CEA Grid: 0.710 tCO2/MWh', 'EmissionFactor.co2Ef', 'Blueprint used older version. CEA Version 21.0 (FY2024-25) gives 0.710', 'CEA CO2 Baseline Database v21.0'],
  ['R22 GWP: 1810', 'R22 GWP: 1760', 'GwpValue.gwp', 'Blueprint used AR4 value. AR5 Table 8.A.1 gives 1760', 'IPCC AR5 WG1 Table 8.A.1'],
  ['HFC-134a GWP: 1430', 'HFC-134a GWP: 1300', 'GwpValue.gwp', 'Blueprint used AR4 value. AR5 Table 8.A.1 gives 1300', 'IPCC AR5 WG1 Table 8.A.1'],
  ['FO NCV: 40.19 TJ/Gg', 'FO NCV: 40.4 TJ/Gg', 'FuelProperty.ncvTjPerGg', 'Blueprint used non-standard value. IPCC 2006 Vol 2 Table 1.2 gives 40.4 for Residual Fuel Oil', 'IPCC 2006 Vol 2 Table 1.2'],
  ['CH4/N2O from Table 2.2', 'CH4/N2O from Table 2.3', 'EmissionFactor.ch4Ef/n2oEf', 'Table 2.2 is for Energy Industries. Table 2.3 is for Manufacturing — more appropriate for MSMEs', 'IPCC 2006 Vol 2 Table 2.3'],
];

// ── Build Workbook ─────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

const addSheet = (data: unknown[][], name: string) => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Set column widths
  const maxCols = data[0]?.length || 0;
  ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, ws, name);
};

addSheet(fuelPropertyAudit, 'Fuel Properties');
addSheet(gwpAudit, 'GWP Values');
addSheet(gridAudit, 'Grid EF');
addSheet(processAudit, 'Process EFs');
addSheet(scope3Audit, 'Scope 3 EFs');
addSheet(benchmarkAudit, 'Sector Benchmarks');
addSheet(correctionsAudit, 'Blueprint Corrections');

const outputPath = path.join(__dirname, 'source-audit.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`Source audit spreadsheet generated: ${outputPath}`);
console.log('Sheets: Fuel Properties, GWP Values, Grid EF, Process EFs, Scope 3 EFs, Sector Benchmarks, Blueprint Corrections');
