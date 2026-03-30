import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Calculator,
  Download,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const capabilities = [
  "Scope 1 direct emissions (combustion, process, fugitive)",
  "Scope 2 grid electricity (CEA factors)",
  "Scope 3 upstream (purchased goods, transport, waste, travel)",
  "BRSR Principle 6 disclosure mapping",
  "IPCC 2006 Tier 1 emission factors",
  "Unit conversion (litres, kg, cylinders, bags, lakh units, INR)",
  "Data quality scoring (Primary / Secondary / Estimated)",
  "Sector benchmarking (Worldsteel, BEE PAT)",
];

const workflow = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Enter facility and activity data",
    description:
      "Organisation profile, facilities, fuel consumption, electricity, process inputs, and value chain data.",
  },
  {
    icon: Calculator,
    step: "02",
    title: "Calculate emissions",
    description:
      "IPCC 2006 factors applied per fuel type. Unit conversion, GWP weighting, and cross-checks run automatically.",
  },
  {
    icon: Download,
    step: "03",
    title: "Export compliance reports",
    description:
      "Download BRSR-formatted PDF, Word, or Excel. Full audit trail with emission factor references.",
  },
];

const sectors = [
  { name: "EAF Mini Mill", active: true },
  { name: "Induction Furnace", active: true },
  { name: "Re-Rolling Mill", active: true },
  { name: "Forging", active: true },
  { name: "Foundry", active: true },
  { name: "Textiles", active: false },
  { name: "Ceramics", active: false },
  { name: "Chemicals", active: false },
];

const faqs = [
  {
    q: "What emission factors are used?",
    a: "IPCC 2006 Guidelines (Vol 2 Tables 1.2, 1.4, 2.3) for combustion. CEA CO2 Baseline Database v21.0 for grid electricity. DEFRA 2024 for Scope 3. Every factor is traceable to its source document.",
  },
  {
    q: "Which reporting framework does this support?",
    a: "Outputs map to SEBI BRSR Core Principle 6 (7 disclosure fields). The methodology note follows ISO 14064-1 requirements. Detailed reports include full GHG Protocol-compliant breakdown.",
  },
  {
    q: "How is data quality handled?",
    a: "Every data point is tagged as Primary (metered), Secondary (purchase records), or Estimated (spend-based). A weighted quality score is calculated. Spend-based entries are auto-flagged as Estimated.",
  },
  {
    q: "What export formats are available?",
    a: "PDF (BRSR-formatted), Word (copy-paste ready for annual reports), Excel (multi-sheet with detail by scope), and CSV/JSON for data integration.",
  },
  {
    q: "Is my data stored securely?",
    a: "Data is processed locally in your browser session. Calculations run server-side but no data is shared with third parties. Export your reports and clear your session at any time.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero — dark, minimal, tool-first */}
      <section className="bg-slate-900 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-teal-400 uppercase">
            GHG Inventory Tool
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.15]">
            Calculate and report your Scope 1, 2, 3 emissions
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-400 max-w-2xl">
            A structured inventory tool for Indian iron and steel MSMEs.
            Enter your facility data, apply verified emission factors, and
            generate BRSR-ready disclosure reports.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/wizard"
              className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              Start Inventory
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              View sample output
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* What it covers */}
      <section className="border-b border-zinc-100 bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-zinc-900">
            What this tool covers
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <div key={cap} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span className="text-sm leading-6 text-zinc-600">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-zinc-50 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-zinc-900">How it works</h2>
          <div className="mt-8 space-y-8">
            {workflow.map((w) => (
              <div key={w.step} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-mono font-bold text-teal-400">
                  {w.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {w.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {w.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="border-b border-zinc-100 bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-zinc-900">
            Supported sectors
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Iron & Steel sub-sectors are fully supported. Additional sectors
            are in development.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {sectors.map((s) => (
              <span
                key={s.name}
                className={
                  s.active
                    ? "rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-400"
                }
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="bg-zinc-50 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-zinc-900">
            Emission factor sources
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            All data points are auditable to source. A full audit spreadsheet
            is included with the project.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "IPCC 2006 Guidelines",
                detail: "Vol 2 Energy, Vol 3 IPPU. Combustion factors, process emissions, NCV values.",
              },
              {
                name: "CEA CO2 Baseline Database",
                detail: "Version 21.0 (FY2024-25). Indian grid emission factor: 0.710 tCO2/MWh.",
              },
              {
                name: "DEFRA UK GHG Factors 2024",
                detail: "Scope 3 lifecycle factors for materials, freight, waste, and business travel.",
              },
              {
                name: "IPCC AR5 GWP Values",
                detail: "100-year GWP. CH4=28, N2O=265, SF6=23,500. AR6 values available.",
              },
            ].map((src) => (
              <div
                key={src.name}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <p className="text-sm font-medium text-zinc-900">{src.name}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {src.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-zinc-100 bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-zinc-900">
            Frequently asked questions
          </h2>
          <div className="mt-8 divide-y divide-zinc-100">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-zinc-900">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 px-6 py-14">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6">
          <div>
            <p className="text-base font-medium text-white">
              Create your GHG inventory
            </p>
            <p className="mt-1 text-sm text-slate-400">
              No account required. Data stays in your session.
            </p>
          </div>
          <Link
            href="/wizard"
            className="shrink-0 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-500"
          >
            Start Inventory
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs text-zinc-400">
            GHG Protocol Corporate Standard &middot; ISO 14064-1 &middot; SEBI
            BRSR Core &middot; IPCC 2006 &middot; CEA India
          </p>
        </div>
      </footer>
    </div>
  );
}
