# CLAUDE.md

## Project: GHG Inventorisation Tool for Indian MSMEs

A standalone web application for GHG (Greenhouse Gas) inventorisation, purpose-built for Indian MSMEs. GHG Protocol-aligned, ISO 14064-1 compatible, BRSR Core-ready. Starting with Iron & Steel sector.

## Build & Run Commands

```bash
export PATH="/c/Program Files/nodejs:$PATH"

npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run test             # Run vitest tests
npm run test:watch       # Watch mode

npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed reference data (fuel properties, EFs, conversions)
npm run db:reset         # Reset database (destructive)
```

## Architecture

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand (wizard multi-step form)
- **Database**: SQLite via Prisma v7 (local dev); PostgreSQL/Supabase for production
- **Charts**: Recharts
- **PDF**: jsPDF
- **Word**: docx (npm)
- **Excel**: xlsx
- **Auth**: Supabase Auth (planned)

### Directory Structure

```
src/
  app/
    page.tsx               # Landing page
    wizard/page.tsx        # Data collection wizard (7 steps)
    dashboard/page.tsx     # Results dashboard
    api/
      organisations/       # Org CRUD
      facilities/          # Facility CRUD
      periods/             # Reporting period CRUD
      activity-data/       # Activity data CRUD
      calculate/           # Calculation engine trigger
      results/             # Get calculated results
      emission-factors/    # Reference data
      fuel-properties/     # Reference data
      benchmarks/          # Sector benchmarks
      reports/             # Report generation
      export/              # Data export (JSON/CSV/Excel)
  lib/
    calc-engine/           # Pure calculation engine (no side effects)
      unit-converter.ts    # Indian unit conversion (litres, kg, cylinders, bags, etc.)
      emission-calculator.ts # Core: Activity Data × EF = CO2e
      aggregator.ts        # Roll up by scope, facility, period
      cross-check.ts       # Sector-specific sanity checks
      data-quality.ts      # PRIMARY/SECONDARY/ESTIMATED scoring
      brsr-mapper.ts       # Map outputs to BRSR Principle 6 fields
      index.ts             # Orchestrator
    db.ts                  # Prisma singleton
    utils.ts               # Utility functions (cn, etc.)
  components/
    wizard/                # Wizard step components
    dashboard/             # Chart & table components
    ui/                    # Shared UI primitives
  generated/prisma/        # Prisma v7 generated client
prisma/
  schema.prisma            # 11 models (7 core + 4 reference)
  seed.ts                  # Reference data seeder
data/
  source-audit.xlsx        # Audit trail: every data point mapped to its source
```

### Database Schema (11 models)

**Core (7)**: Organisation, Facility, ReportingPeriod, ActivityData, EmissionFactor, CalculatedEmission, Report

**Reference (4)**: FuelProperty, GwpValue, UnitConversion, SectorBenchmark

### Methodology

- **Primary Standard**: GHG Protocol Corporate Standard (Revised 2004)
- **Supporting**: ISO 14064-1:2018
- **India-Specific**: India GHG Program, CEA grid factors, BRSR alignment
- **Boundary**: Operational Control approach
- **GWP**: AR5 default (CH4=28, N2O=265), configurable for AR6
- **Scope 3**: Categories 1, 4, 5, 6, 9

### Calculation Formula

```
For each activity data entry:
1. Look up matching emission factor (fuel type, scope, region, date range)
2. Convert units if needed (litres → kg via density; INR → quantity via fuel price)
3. CO2 = Activity Data × CO2 EF
4. CH4 (CO2e) = Activity Data × CH4 EF × CH4 GWP
5. N2O (CO2e) = Activity Data × N2O EF × N2O GWP
6. Total CO2e = CO2 + CH4(CO2e) + N2O(CO2e)
7. Store with exact EF version reference
8. Aggregate by scope, category, facility, period
```

### Data Provenance

**Every data point is auditable.** All emission factors, fuel properties, GWP values, and conversion factors are traceable to their source:
- `source` field on every EF/fuel/GWP record
- `sourceVersion` for specific document/table reference
- `sourceUrl` for URL to source document
- `data/source-audit.xlsx` master audit spreadsheet

### Key Sources
- IPCC 2006 Guidelines (emission factors): efdb.ipcc.int
- CEA CO2 Baseline Database (Indian grid factors): cea.nic.in
- DEFRA UK GHG Conversion Factors (annual): gov.uk
- India GHG Program (transport EFs): indiaghgp.org
- IPCC AR5/AR6 (GWP values): IPCC Assessment Reports

### Important Notes

- **Prisma v7**: Uses `prisma.config.ts` for datasource URL, NOT `url` in schema.prisma
- **Prisma v7 client import**: `import { PrismaClient } from '@/generated/prisma/client'`
- **Prisma v7 SQLite adapter**: Must use `@prisma/adapter-better-sqlite3` — `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })`
- **Seed script**: Uses absolute path `path.resolve(__dirname, '..', 'dev.db')` — the DB lives at project root, not `prisma/`
- **Blueprint corrections**: NCV Diesel=43.0 (not 43.33), CEA grid=0.710 (not 0.708), R22 GWP=1760 (not 1810, that was AR4), HFC-134a GWP=1300 (not 1430). See `data/source-audit.xlsx` "Blueprint Corrections" sheet.
- **Financial Year**: Indian FY is April-March; BRSR reporting follows this
- **Biogenic CO2**: From biomass combustion — reported separately, NOT added to Scope 1 total (GHG Protocol rule)
- **Spend-based fallback**: When MSME enters INR spent instead of quantity, divide by fuel price to estimate quantity. Always flag as ESTIMATED quality.
- **Unit chaos**: Indian MSMEs use litres, kg, tonnes, cylinders (14.2kg domestic, 19kg commercial), bags (50kg), units (=kWh), lakh units (100,000 kWh)
