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
    'How are emission reduction recommendations generated?',
    'What does payback period mean for a technology?',
    'Can I combine multiple technologies?',
    'How is the CO2 reduction calculated?',
    'What funding schemes are available for my technology?',
  ],

  // Funding Directory
  funding: [
    'What government schemes support emission reduction?',
    'Am I eligible for BEE PAT scheme?',
    'What is the difference between subsidy and loan schemes?',
    'How do I apply for MSME technology upgradation fund?',
    'Are there state-specific funding schemes?',
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
