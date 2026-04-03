/**
 * Suggested follow-up questions per wizard step.
 *
 * Used by the AI assistant endpoint to return contextually relevant
 * question suggestions alongside the LLM reply.
 */

export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  // Step 1 — Organisation
  organisation: [
    'What is a UDYAM number and do I need it?',
    'Which sub-sector should I pick for my factory?',
    'What is the difference between EAF and Induction Furnace?',
    'Why does the tool ask for my state?',
    'Can I add multiple factories under one organisation?',
  ],

  // Step 2 — Facilities
  facilities: [
    'How do I decide what counts as a separate facility?',
    'My factory and office are in the same compound — one or two facilities?',
    'What is a grid region and why does it matter?',
    'Does the tool cover facilities outside India?',
    'Can I add a warehouse as a facility?',
  ],

  // Step 3 — Reporting Period
  period: [
    'Why does it use April-March instead of January-December?',
    'Should I report annually or quarterly?',
    'What if my factory started mid-year?',
    'What is BRSR and do I need to follow it?',
    'Can I report for a previous year?',
  ],

  // Step 4 — Scope 1
  scope1: [
    'What fuels count as Scope 1?',
    'Where do I find my coal consumption data?',
    'Is my DG set diesel Scope 1 or Scope 2?',
    'How do I track refrigerant leaks?',
    'What are process emissions in a steel plant?',
    'Is rice husk biogenic? Does it count in my total?',
    'How do I convert LPG cylinders to kg?',
    'What if I use multiple fuels in one furnace?',
  ],

  // Step 5 — Scope 2
  scope2: [
    'Where do I find my electricity consumption?',
    'What is 1 unit of electricity in kWh?',
    'Is my rooftop solar zero-emission?',
    'What emission factor is used for my state?',
    'Is captive power generation Scope 1 or Scope 2?',
    'What is the CEA grid emission factor?',
    'How do I report open-access renewable power?',
  ],

  // Step 6 — Scope 3
  scope3: [
    'What Scope 3 categories are relevant for my steel plant?',
    'How do I estimate emissions from purchased scrap?',
    'How do I calculate transport emissions?',
    'What is employee commute and how do I estimate it?',
    'Can I skip Scope 3 for now?',
    'What data do I need from my logistics provider?',
    'How do I estimate waste emissions?',
  ],

  // Step 7 — Review
  review: [
    'What does data quality PRIMARY/SECONDARY/ESTIMATED mean?',
    'How can I improve my data quality?',
    'What should I check before submitting?',
    'Can I edit data after submitting?',
    'What happens after I submit?',
  ],

  // Dashboard
  dashboard: [
    'What does tCO2e per tonne of steel mean?',
    'How does my intensity compare to the sector average?',
    'Which scope has the highest emissions?',
    'What is BRSR Principle 6?',
    'How can I reduce my emissions?',
    'Can I export my results as a PDF?',
  ],

  // Recommendations
  recommendations: [
    'What is my total emission reduction from the enabled technologies?',
    'Which technology gives me the best payback?',
    'What does the already-implemented percentage mean?',
    'How much CAPEX do I need for all the enabled technologies?',
    'Are there funding schemes for the technologies I selected?',
    'What is the difference between CAPEX and RESCO solar models?',
    'How are the CO2 reduction numbers calculated?',
    'What should I prioritise first for maximum reduction?',
    'What happens if I combine multiple technologies — do savings stack?',
    'Is green open access better than rooftop solar for my factory?',
  ],

  // Funding Directory
  funding: [
    'What is the first step to apply for ADEETIE?',
    'How much does an energy audit cost, and is it reimbursable?',
    'Can I get a loan without collateral for energy efficiency equipment?',
    'What is the difference between ADEETIE and SIDBI 4E?',
    'How does the EESL ESCO model work — do I pay anything upfront?',
    'What documents do I need for ADEETIE application?',
    'Who is my State Designated Agency (SDA)?',
    'How long does the entire ADEETIE process take?',
    'What is a DPR and who prepares it?',
    'Is CGTMSE collateral-free guarantee available for EE loans?',
    'What subsidy can I get for rooftop solar in my state?',
    'What is interest subvention and how does it reduce my loan cost?',
  ],
};

/**
 * Returns 2-3 suggested questions relevant to the current step.
 * Randomly selects from the pool to keep suggestions fresh.
 */
export function getSuggestedQuestions(step: string, count: number = 3): string[] {
  const pool = SUGGESTED_QUESTIONS[step] || SUGGESTED_QUESTIONS['organisation'];
  if (pool.length <= count) return [...pool];

  // Fisher-Yates partial shuffle to pick `count` random items
  const copy = [...pool];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
