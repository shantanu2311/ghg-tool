/**
 * IPCC Emission Factor Lookup Table
 *
 * Used by the custom source AI-assisted matching feature.
 * All values sourced from 2019 Refinement to the 2006 IPCC Guidelines for National GHG Inventories,
 * Volume 2 (Energy), Chapter 2, Tables 2.2–2.5 unless otherwise noted.
 *
 * Units: CO2/CH4/N2O in kg per TJ; NCV in TJ per Gg (= MJ/kg).
 */

export interface IpccEfEntry {
  name: string;
  keywords: string[];
  co2EfKgPerTj: number;
  ch4EfKgPerTj: number | null;
  n2oEfKgPerTj: number | null;
  efUnit: string;
  ncvTjPerGg: number | null;
  source: string;
  biogenic?: boolean;
}

export const IPCC_EF_LOOKUP: IpccEfEntry[] = [
  // ── Solid Fossil Fuels ──────────────────────────────────────────────
  {
    name: 'Petroleum Coke (Pet Coke)',
    keywords: ['pet coke', 'petcoke', 'petroleum coke', 'calcined coke', 'refinery coke'],
    co2EfKgPerTj: 97500,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 0.1,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 32500,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.2 (Petroleum Coke)',
  },
  {
    name: 'Coal (Bituminous / Run of Mine)',
    keywords: ['coal', 'bituminous coal', 'run of mine', 'rom coal', 'thermal coal', 'steam coal'],
    co2EfKgPerTj: 96100,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 1.5,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 25800,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.2 (Other Bituminous Coal)',
  },
  {
    name: 'Sub-Bituminous Coal',
    keywords: ['sub-bituminous', 'sub bituminous coal', 'low grade coal'],
    co2EfKgPerTj: 96100,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 1.5,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 18900,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.2 (Sub-Bituminous Coal)',
  },
  {
    name: 'Coke Oven Coke',
    keywords: ['coke oven', 'metallurgical coke', 'met coke', 'foundry coke', 'hard coke'],
    co2EfKgPerTj: 107000,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 0.1,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 28200,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.2 (Coke Oven Coke)',
  },

  // ── Liquid Fossil Fuels ─────────────────────────────────────────────
  {
    name: 'Kerosene',
    keywords: ['kerosene', 'kerosine', 'kero', 'superior kerosene oil', 'sko', 'jet fuel'],
    co2EfKgPerTj: 71900,
    ch4EfKgPerTj: 3,
    n2oEfKgPerTj: 0.6,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 43800,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (Other Kerosene)',
  },
  {
    name: 'Naphtha',
    keywords: ['naphtha', 'light naphtha', 'heavy naphtha', 'petroleum naphtha'],
    co2EfKgPerTj: 73300,
    ch4EfKgPerTj: 3,
    n2oEfKgPerTj: 0.6,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 44500,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (Naphtha)',
  },
  {
    name: 'Diesel (HSD)',
    keywords: ['diesel', 'hsd', 'high speed diesel', 'gas oil', 'automotive diesel'],
    co2EfKgPerTj: 74100,
    ch4EfKgPerTj: 3,
    n2oEfKgPerTj: 0.6,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 43000,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (Gas/Diesel Oil)',
  },
  {
    name: 'Furnace Oil (Residual Fuel Oil)',
    keywords: ['furnace oil', 'fo', 'residual fuel oil', 'heavy fuel oil', 'hfo', 'bunker fuel'],
    co2EfKgPerTj: 77400,
    ch4EfKgPerTj: 3,
    n2oEfKgPerTj: 0.6,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 40400,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (Residual Fuel Oil)',
  },
  {
    name: 'LPG (Liquefied Petroleum Gas)',
    keywords: ['lpg', 'liquefied petroleum gas', 'cooking gas', 'propane', 'butane', 'commercial cylinder'],
    co2EfKgPerTj: 63100,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 0.1,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 47300,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (LPG)',
  },
  {
    name: 'Petrol (Motor Spirit / Gasoline)',
    keywords: ['petrol', 'motor spirit', 'gasoline', 'ms', 'motor gasoline'],
    co2EfKgPerTj: 69300,
    ch4EfKgPerTj: 3,
    n2oEfKgPerTj: 0.6,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 44300,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.3 (Motor Gasoline)',
  },

  // ── Gaseous Fossil Fuels ────────────────────────────────────────────
  {
    name: 'Natural Gas (PNG)',
    keywords: ['natural gas', 'png', 'piped natural gas', 'methane', 'cng', 'compressed natural gas'],
    co2EfKgPerTj: 56100,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 0.1,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 48000,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.4 (Natural Gas)',
  },
  {
    name: 'Acetylene',
    keywords: ['acetylene', 'welding gas', 'cutting gas', 'dissolved acetylene', 'da cylinder'],
    co2EfKgPerTj: 56100,
    ch4EfKgPerTj: 1,
    n2oEfKgPerTj: 0.1,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 48200,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.4 (derived — hydrocarbon gas)',
  },

  // ── Biomass / Biogenic Fuels ────────────────────────────────────────
  {
    name: 'Rice Husk',
    keywords: ['rice husk', 'rice hull', 'paddy husk', 'chaff'],
    co2EfKgPerTj: 100000,
    ch4EfKgPerTj: 30,
    n2oEfKgPerTj: 4,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 13800,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.5 (Other Primary Solid Biomass)',
    biogenic: true,
  },
  {
    name: 'Bagasse',
    keywords: ['bagasse', 'sugarcane bagasse', 'cane bagasse', 'sugar mill waste'],
    co2EfKgPerTj: 100000,
    ch4EfKgPerTj: 30,
    n2oEfKgPerTj: 4,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 7700,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.5 (Bagasse)',
    biogenic: true,
  },
  {
    name: 'Biomass Briquettes',
    keywords: ['briquettes', 'biomass briquettes', 'agri waste briquettes', 'bio briquettes', 'bio coal', 'white coal'],
    co2EfKgPerTj: 100000,
    ch4EfKgPerTj: 30,
    n2oEfKgPerTj: 4,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 15600,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.5 (Other Primary Solid Biomass)',
    biogenic: true,
  },
  {
    name: 'Charcoal',
    keywords: ['charcoal', 'wood charcoal', 'biomass charcoal'],
    co2EfKgPerTj: 112000,
    ch4EfKgPerTj: 200,
    n2oEfKgPerTj: 4,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 29500,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.5 (Charcoal)',
    biogenic: true,
  },
  {
    name: 'Wood / Firewood',
    keywords: ['wood', 'firewood', 'fuel wood', 'timber', 'wood chips', 'sawdust'],
    co2EfKgPerTj: 112000,
    ch4EfKgPerTj: 30,
    n2oEfKgPerTj: 4,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 15600,
    source: 'IPCC 2019 Refinement, Vol 2, Table 2.5 (Wood/Wood Waste)',
    biogenic: true,
  },

  // ── Industrial Process Materials (Scope 1 Process / Scope 3) ────────
  {
    name: 'Aluminium (Primary Production)',
    keywords: ['aluminium', 'aluminum', 'primary aluminium', 'aluminium ingot', 'aluminium smelting'],
    co2EfKgPerTj: 0,
    ch4EfKgPerTj: null,
    n2oEfKgPerTj: null,
    efUnit: 'tCO2e/tonne product',
    ncvTjPerGg: null,
    source: 'IPCC 2019 Refinement, Vol 3, Ch 4 (Primary Aluminium — ~8.6 tCO2e/t from electrolysis + energy)',
  },
  {
    name: 'Copper (Primary Production)',
    keywords: ['copper', 'primary copper', 'copper smelting', 'copper cathode'],
    co2EfKgPerTj: 0,
    ch4EfKgPerTj: null,
    n2oEfKgPerTj: null,
    efUnit: 'tCO2e/tonne product',
    ncvTjPerGg: null,
    source: 'IPCC 2019 Refinement, Vol 3, Ch 4 (Non-Ferrous Metals)',
  },
  {
    name: 'Cement (Clinker Production)',
    keywords: ['cement', 'clinker', 'portland cement', 'cement production', 'calcination'],
    co2EfKgPerTj: 0,
    ch4EfKgPerTj: null,
    n2oEfKgPerTj: null,
    efUnit: 'tCO2/tonne clinker',
    ncvTjPerGg: null,
    source: 'IPCC 2019 Refinement, Vol 3, Ch 2 (Cement — 0.507 tCO2/t clinker from calcination)',
  },
  {
    name: 'Plastic / Polymer (Waste Combustion)',
    keywords: ['plastic', 'polymer', 'polyethylene', 'polypropylene', 'pvc', 'pet', 'hdpe', 'ldpe', 'plastic waste', 'plastic incineration'],
    co2EfKgPerTj: 75000,
    ch4EfKgPerTj: null,
    n2oEfKgPerTj: null,
    efUnit: 'kg/TJ',
    ncvTjPerGg: 32000,
    source: 'IPCC 2019 Refinement, Vol 5, Ch 5 (Incineration — mixed plastics)',
  },

  // ── Transport / Scope 3 ────────────────────────────────────────────
  {
    name: 'Employee Commute (Car / Two-Wheeler)',
    keywords: ['employee commute', 'staff commute', 'commuting', 'employee travel', 'two wheeler commute', 'car commute'],
    co2EfKgPerTj: 0,
    ch4EfKgPerTj: null,
    n2oEfKgPerTj: null,
    efUnit: 'kgCO2e/km',
    ncvTjPerGg: null,
    source: 'DEFRA 2024, Business Travel — average car ~0.17 kgCO2e/km, motorbike ~0.11 kgCO2e/km',
  },
];

// ---------------------------------------------------------------------------
// Keyword-based best-match search
// ---------------------------------------------------------------------------

/**
 * Finds the best-matching IPCC EF entry for a given query string.
 * Uses keyword overlap scoring — the entry with the most keyword matches wins.
 * Returns null if no keywords match at all.
 */
export function findBestMatch(query: string): IpccEfEntry | null {
  if (!query || query.trim().length === 0) return null;

  const normalised = query.toLowerCase().trim();
  let bestEntry: IpccEfEntry | null = null;
  let bestScore = 0;

  for (const entry of IPCC_EF_LOOKUP) {
    let score = 0;

    // Exact name match gets a big bonus
    if (normalised === entry.name.toLowerCase()) {
      return entry;
    }

    // Check each keyword against the query
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (normalised.includes(kw)) {
        // Longer keyword matches are more specific, so weight by length
        score += kw.length;
      } else if (kw.includes(normalised)) {
        // Query is a substring of the keyword (partial match)
        score += normalised.length * 0.5;
      }
    }

    // Also check if the entry name appears in the query
    const nameLower = entry.name.toLowerCase();
    if (normalised.includes(nameLower)) {
      score += nameLower.length * 0.8;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require a minimum score to avoid spurious matches
  return bestScore >= 3 ? bestEntry : null;
}
