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
- **Database**: PostgreSQL (Neon) via Prisma v7 + `@prisma/adapter-pg`
- **Charts**: Recharts
- **PDF**: jsPDF
- **Word**: docx (npm)
- **Excel**: xlsx
- **Auth**: NextAuth.js v5 (Auth.js) — JWT sessions, credentials provider
- **Encryption**: AES-256-GCM field-level encryption for PII (name, email, address, udyam)

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
    rec-engine/            # Module 2: recommendation engine (pure functions)
      matcher.ts           # 5-filter cascade matching
      impact-calculator.ts # Per-tech CO2/energy/cost impact
      funding-matcher.ts   # Scheme eligibility + net capex
      index.ts             # Orchestrator + sequential combinedImpact
      types.ts             # All Module 2/3 types
    what-if-store.ts       # Zustand store for recommendation simulator
    export/
      reduction-plan-pdf.ts  # PDF export for reduction plan
      reduction-plan-word.ts # Word export for reduction plan
    db.ts                  # Prisma singleton (PostgreSQL via pg adapter)
    utils.ts               # Utility functions (cn, etc.)
  components/
    wizard/                # Wizard step components
    dashboard/             # Chart & table components
    recommendations/       # Module 2: tech cards, charts, funding panel
    ui/                    # Shared UI primitives
  generated/prisma/        # Prisma v7 generated client
prisma/
  schema.prisma            # 14 models (7 core + 4 reference + 3 module 2/3)
  seed.ts                  # Reference data seeder (incl. 23 techs, 6 schemes, 44 links)
data/
  source-audit.xlsx        # Audit trail: every data point mapped to its source
```

### Database Schema (14 models)

**Core (7)**: Organisation, Facility, ReportingPeriod, ActivityData, EmissionFactor, CalculatedEmission, Report

**Reference (4)**: FuelProperty, GwpValue, UnitConversion, SectorBenchmark

**Module 2/3 (3)**: ReductionTechnology, FundingScheme, TechFundingLink

### Methodology

- **Primary Standard**: GHG Protocol Corporate Standard (Revised 2004)
- **Supporting**: ISO 14064-1:2018
- **India-Specific**: India GHG Program, CEA grid factors v21.0 (FY2024-25, regional breakdown available), BRSR alignment
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
- IPCC 2019 Refinement to the 2006 IPCC Guidelines (emission factors): ipcc-nggip.iges.or.jp
- CEA CO2 Baseline Database v21.0 (Indian grid factors, FY2024-25): cea.nic.in — national avg=0.710; regional: N=0.898, W=0.672, S=0.617, E=0.826, NE=0.476
- DEFRA UK GHG Conversion Factors 2024: gov.uk
- India GHG Program (transport EFs): indiaghgp.org
- IPCC AR5/AR6 (GWP values): IPCC Assessment Reports

### Important Notes

- **Prisma v7**: Uses `prisma.config.ts` for datasource URL, NOT `url` in schema.prisma
- **Prisma v7 client import**: `import { PrismaClient } from '@/generated/prisma/client'`
- **Prisma v7 PostgreSQL adapter**: Uses `@prisma/adapter-pg` with `pg.Pool` — `new PrismaClient({ adapter: new PrismaPg(pool) })`
- **Database**: Neon PostgreSQL (free tier, serverless). Connection string in `.env`
- **AUTH_URL**: Must match the actual dev server port (e.g., `AUTH_URL=http://localhost:3001` if port 3000 is occupied). Mismatch causes NextAuth redirect failures.
- **Funding seed data**: 6 active schemes (S001, S003, S004, S008, S009, S010) audited against official sources. Removed: S002 BEE-GEF-UNIDO (concluded 2022), S005 PM Surya Ghar (never extended to MSMEs), S006 CLCS-TUS (closed March 2020), S007 ZED (expired March 2026).
- **Blueprint corrections**: NCV Diesel=43.0 (not 43.33), CEA national avg=0.710 (not 0.708; regional: N=0.898, W=0.672, S=0.617, E=0.826, NE=0.476), R22 GWP=1760 (not 1810, that was AR4), HFC-134a GWP=1300 (not 1430). See `data/source-audit.xlsx` "Blueprint Corrections" sheet.
- **Financial Year**: Indian FY is April-March; BRSR reporting follows this
- **Biogenic CO2**: From biomass combustion — reported separately, NOT added to Scope 1 total (GHG Protocol rule)
- **Spend-based fallback**: When MSME enters INR spent instead of quantity, divide by fuel price to estimate quantity. Always flag as ESTIMATED quality.
- **Unit chaos**: Indian MSMEs use litres, kg, tonnes, cylinders (14.2kg domestic, 19kg commercial), bags (50kg), units (=kWh), lakh units (100,000 kWh)

### Module 2: Emission Reduction Recommendations

- **Matching**: 5-filter cascade (sector → subSector → fuelType → category → threshold) in `rec-engine/matcher.ts`
- **Sequential combination**: Reductions applied to residual, NOT additive. 3×20% = 48.8%, not 60%. Sorted by payback ascending. Critical logic in `rec-engine/index.ts:calculateCombinedImpact()`
- **Client-side recalculation**: `what-if-store.ts` fetches recommendations once via POST, then all toggle/recalculation is client-side using imported pure functions
- **JSON arrays in DB**: `matchesFuelTypes`, `matchesCategories`, etc. stored as JSON strings in PostgreSQL, parsed in JS (23 techs = trivial)
- **Seed data**: 23 technologies (T001-T023), 6 funding schemes (S001, S003, S004, S008, S009, S010), 44 tech-funding links

### Module 3: Funding Directory & Financing Journey

- Standalone page at `/funding` — not tied to any inventory period
- **3-tab layout**: Action Plan (default) | All Schemes | Find Help
- **Tab 1 — Action Plan**: Step-by-step guided action plans per scheme (ADEETIE, EESL, SIDBI, Solar). Expandable steps with time/cost estimates, document checklists, jargon auto-linking, tips, and action URLs.
- **Tab 2 — All Schemes**: Two-panel layout with technologies on left, schemes on right. Interactive mapping (click tech → schemes highlight, click scheme → techs highlight). Context-aware filtering by sector/sub-sector/state/turnover.
- **Tab 3 — Find Help**: Service provider directory (SDAs, auditors, ESCOs, banks). Filterable by type.
- **Jargon tooltips**: 15 technical terms (DEA, IGEA, DPR, ESCO, M&V, CGTMSE, etc.) with hover tooltips explaining full form, cost, reimbursement, and who does it. Auto-linked in action plan descriptions.
- **JargonProvider**: React context wrapping the funding page, fetches `/api/jargon` once on mount.
- **Cost calculator**: POST `/api/cost-calculator` with techId + schemeId, returns net cost after subsidy/subvention.
- **New DB models**: JargonEntry (15 terms), ActionPlanStep (21 steps across 4 schemes), ServiceProvider (12 providers).
- **Seed data**: 5 SDAs, 3 auditor bodies, 3 financing institutions, 1 portal.
- `showAllTechs` toggle reveals non-relevant technologies (dimmed)
- API response format: `{ schemes: [...with eligible/relevant flags], context: { sector, subSector, relevantTechIds } | null }`
- Degrades gracefully when not authenticated (shows all data without context filtering)

### New Pages (v2)

| Route | Purpose |
|-------|---------|
| `/recommendations` | Period picker for reduction simulator |
| `/recommendations/[periodId]` | 3-column what-if simulator |
| `/recommendations/[periodId]/report` | Exportable reduction plan (PDF/Word) |
| `/funding` | Standalone funding directory |

### New API Routes (v2)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/technologies` | List techs with optional filters |
| GET | `/api/technologies/[techId]` | Single tech + funding links |
| POST | `/api/recommendations/[periodId]` | Run engine for a period |
| GET | `/api/funding` | List schemes with optional filters |
| GET | `/api/funding/[schemeId]` | Single scheme detail |
| GET | `/api/funding/for-tech/[techId]` | Schemes for a tech |
| GET | `/api/jargon` | All jargon entries (no auth) |
| GET | `/api/action-plans/[schemeId]` | Step-by-step plan for a scheme |
| GET | `/api/service-providers` | Filterable provider directory |
| POST | `/api/cost-calculator` | Net cost after subsidy/subvention |

### Authentication & Encryption

- **Auth**: NextAuth.js v5 with CredentialsProvider (email + bcrypt-hashed password)
- **Session**: JWT strategy (no DB sessions) — `session.user.id` available in all routes
- **Middleware**: `src/middleware.ts` protects `/dashboard`, `/wizard`, `/recommendations`, `/funding`
- **Auth pages**: `/login` and `/signup` in `(auth)` route group
- **Types**: `src/types/next-auth.d.ts` extends Session/JWT with `id` field

### Data Encryption (AES-256-GCM)

- **Implementation**: `src/lib/crypto.ts` — `encrypt()` / `decrypt()` functions
- **Format**: `base64(iv + ciphertext + authTag)` — single string, safe for text columns
- **Key**: `ENCRYPTION_KEY` env var (32 bytes hex). Without it, DB data is unreadable ciphertext.
- **Encrypted fields**:
  - `User.name`
  - `Organisation.name`, `udyamNumber`, `district`, `contactEmail`, `contactPhone`
  - `Facility.name`, `address`, `district`
- **Plaintext fields** (needed for queries): sector, subSector, state, gridRegion, numeric values
- **Migration safety**: `decrypt()` returns original string if decryption fails (handles pre-encryption data)
- **All API routes**: Encrypt on write, decrypt on read. Auth check via `getAuthenticatedUserId()` from `src/lib/auth-helpers.ts`
- **Row isolation**: Every query filters by `userId` (direct or via org→period chain). Users cannot see each other's data.

### Database Schema (21 models)

**Auth (4)**: User, Account, Session, VerificationToken
**Core (7)**: Organisation (has userId FK), Facility, ReportingPeriod, ActivityData, EmissionFactor, CalculatedEmission, Report
**Reference (4)**: FuelProperty, GwpValue, UnitConversion, SectorBenchmark
**Module 2/3 (3)**: ReductionTechnology, FundingScheme, TechFundingLink
**Financing Journey (3)**: JargonEntry, ActionPlanStep (FK to FundingScheme), ServiceProvider
