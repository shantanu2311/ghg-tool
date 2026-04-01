'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ClipboardList,
  Calculator,
  Download,
  CheckCircle2,
  ShieldCheck,
  Lightbulb,
  Landmark,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const capabilities = [
  'Scope 1 direct emissions (combustion, process, fugitive)',
  'Scope 2 grid electricity (CEA factors)',
  'Scope 3 upstream (purchased goods, transport, waste, travel)',
  'BRSR Principle 6 disclosure mapping',
  'IPCC 2019 Refinement emission factors',
  'Unit conversion (litres, kg, cylinders, bags, lakh units, INR)',
  'Data quality scoring (Primary / Secondary / Estimated)',
  'Sector benchmarking (Worldsteel, BEE PAT)',
];

const workflow = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Enter facility and activity data',
    description:
      'Organisation profile, facilities, fuel consumption, electricity, process inputs, and value chain data.',
  },
  {
    icon: Calculator,
    step: '02',
    title: 'Calculate emissions',
    description:
      'IPCC 2019 Refinement factors applied per fuel type. Unit conversion, GWP weighting, and cross-checks run automatically.',
  },
  {
    icon: Lightbulb,
    step: '03',
    title: 'Simulate reduction technologies',
    description:
      '23 proven technologies with what-if toggles. See CO2 impact, energy savings, CAPEX, and payback -- applied sequentially.',
  },
  {
    icon: Landmark,
    step: '04',
    title: 'Match funding and export reports',
    description:
      'Auto-matched government schemes (BEE, SIDBI, MNRE). Download BRSR-formatted PDF, Word, or Excel reports.',
  },
];

const modules = [
  {
    icon: ClipboardList,
    title: 'GHG Inventory',
    description: 'Scope 1, 2, 3 calculation with IPCC factors and BRSR mapping.',
    href: '/wizard',
  },
  {
    icon: Lightbulb,
    title: 'Reduction Simulator',
    description: '23 technologies with what-if toggles and sequential impact modelling.',
    href: '/recommendations',
  },
  {
    icon: Landmark,
    title: 'Funding Directory',
    description: '10 government schemes matched to your sector and technology choices.',
    href: '/funding',
  },
];

const sectors = [
  { name: 'EAF Mini Mill', active: true },
  { name: 'Induction Furnace', active: true },
  { name: 'Re-Rolling Mill', active: true },
  { name: 'Forging', active: true },
  { name: 'Foundry', active: true },
  { name: 'Textiles', active: false },
  { name: 'Ceramics', active: false },
  { name: 'Chemicals', active: false },
];

const sources = [
  {
    name: 'IPCC 2019 Refinement',
    detail: 'Refinement to 2006 Guidelines. Vol 2 Energy, Vol 3 IPPU. Updated combustion factors, process emissions, NCV values.',
  },
  {
    name: 'CEA CO2 Baseline Database',
    detail: 'Version 21.0 (FY2024-25). National avg: 0.710 tCO2/MWh. Regional: N=0.898, W=0.672, S=0.617, E=0.826, NE=0.476.',
  },
  {
    name: 'DEFRA UK GHG Factors 2024',
    detail: 'Scope 3 lifecycle factors for materials, freight, waste, and business travel.',
  },
  {
    name: 'IPCC AR5 GWP Values',
    detail: '100-year GWP. CH4=28, N2O=265, SF6=23,500. AR6 values available.',
  },
];

const faqs = [
  {
    q: 'What emission factors are used?',
    a: 'IPCC 2019 Refinement (Vol 2 Tables 1.2, 1.4, 2.3) for combustion. CEA CO2 Baseline Database v21.0 for grid electricity. DEFRA 2024 for Scope 3. Every factor is traceable to its source document.',
  },
  {
    q: 'Which reporting framework does this support?',
    a: 'Outputs map to SEBI BRSR Core Principle 6 (7 disclosure fields). The methodology note follows ISO 14064-1 requirements. Detailed reports include full GHG Protocol-compliant breakdown.',
  },
  {
    q: 'How is data quality handled?',
    a: 'Every data point is tagged as Primary (metered), Secondary (purchase records), or Estimated (spend-based). A weighted quality score is calculated. Spend-based entries are auto-flagged as Estimated.',
  },
  {
    q: 'What export formats are available?',
    a: 'PDF (BRSR-formatted), Word (copy-paste ready for annual reports), Excel (multi-sheet with detail by scope), and CSV/JSON for data integration.',
  },
  {
    q: 'Is my data stored securely?',
    a: 'All sensitive data (company name, contact details, facility addresses) is encrypted with AES-256-GCM before storage. Even database administrators cannot read your data. Your account is password-protected and all queries are scoped to your user ID.',
  },
];

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 px-6 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative mx-auto max-w-3xl"
        >
          <p className="text-sm font-medium tracking-wide text-teal-400 uppercase">
            GHG Intelligence Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Measure, reduce, and fund your decarbonisation
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-400 max-w-2xl">
            The complete climate toolkit for Indian MSMEs. Calculate Scope 1, 2, 3 emissions,
            simulate reduction technologies with what-if analysis, match government funding schemes,
            and generate BRSR-ready disclosure reports.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Sign in
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Your data is encrypted and only accessible to you. No one else can see it -- not even us.
          </p>
        </motion.div>
      </section>

      {/* Trust Bar */}
      <Section className="border-b border-border bg-muted/50 px-6 py-6">
        <motion.div variants={fadeUp} className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-center">
          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            GHG Protocol Corporate Standard -- ISO 14064-1 -- SEBI BRSR Core -- IPCC 2019 -- CEA India
          </p>
        </motion.div>
      </Section>

      {/* Modules */}
      <Section className="bg-background px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            Three integrated modules
          </motion.h2>
          <motion.div variants={stagger} className="mt-8 grid gap-4 sm:grid-cols-3">
            {modules.map((m) => (
              <motion.div key={m.title} variants={fadeUp}>
                <Link href={m.href}>
                  <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer">
                    <CardContent className="pt-5">
                      <m.icon className="h-5 w-5 text-primary mb-3" />
                      <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{m.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* What it covers */}
      <Section className="border-y border-border bg-muted/30 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            What this tool covers
          </motion.h2>
          <motion.div variants={stagger} className="mt-6 grid gap-3 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <motion.div key={cap} variants={fadeUp} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm leading-6 text-muted-foreground">{cap}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* Workflow */}
      <Section className="bg-background px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            How it works
          </motion.h2>
          <motion.div variants={stagger} className="mt-8 space-y-6">
            {workflow.map((w, i) => (
              <motion.div key={w.step} variants={fadeUp} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-mono font-semibold text-primary-foreground">
                    {w.step}
                  </div>
                  {i < workflow.length - 1 && (
                    <div className="mt-2 flex-1 w-px border-l-2 border-dashed border-border" />
                  )}
                </div>
                <div className="pb-6">
                  <h3 className="text-sm font-semibold text-foreground">{w.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{w.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* Sectors */}
      <Section className="border-y border-border bg-muted/30 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            Supported sectors
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground">
            Iron & Steel sub-sectors are fully supported. Additional sectors are in development.
          </motion.p>
          <motion.div variants={stagger} className="mt-6 flex flex-wrap gap-2">
            {sectors.map((s) => (
              <motion.div key={s.name} variants={fadeUp}>
                <Badge
                  variant={s.active ? 'default' : 'secondary'}
                  className={s.active ? '' : 'text-muted-foreground'}
                >
                  {s.name}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* Data Sources */}
      <Section className="bg-background px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            Emission factor sources
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-sm text-muted-foreground">
            All data points are auditable to source. A full audit spreadsheet is included with the project.
          </motion.p>
          <motion.div variants={stagger} className="mt-6 grid gap-4 sm:grid-cols-2">
            {sources.map((src) => (
              <motion.div key={src.name} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="pt-4">
                    <p className="text-sm font-semibold text-foreground">{src.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{src.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="border-y border-border bg-muted/30 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.h2 variants={fadeUp} className="text-lg font-semibold tracking-tight text-foreground">
            Frequently asked questions
          </motion.h2>
          <motion.div variants={fadeUp} className="mt-8">
            <Accordion>
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} className="border-b border-border">
                  <AccordionTrigger className="py-4 text-sm font-medium text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-6 text-muted-foreground pb-2">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-teal-950 px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-3xl items-center justify-between gap-6"
        >
          <div>
            <p className="text-base font-semibold text-white">Start your decarbonisation journey</p>
            <p className="mt-1 text-sm text-slate-400">Measure emissions, find reductions, access government funding.</p>
          </div>
          <Link href="/signup">
            <Button size="lg" className="shrink-0 gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs text-muted-foreground">
            GHG Protocol Corporate Standard &middot; ISO 14064-1 &middot; SEBI BRSR Core &middot; IPCC 2019 &middot; CEA India
          </p>
        </div>
      </footer>
    </div>
  );
}
