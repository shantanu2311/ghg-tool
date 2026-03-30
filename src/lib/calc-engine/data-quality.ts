// ── Data Quality Scorer ─────────────────────────────────────────────────────
// GHG Protocol requires data quality assessment.
// Tags: PRIMARY (meter reading), SECONDARY (purchase records), ESTIMATED (spend-based)

import type { DataQuality, DataQualityScore } from './types';
import { DATA_QUALITY_WEIGHTS } from './constants';

/**
 * Calculate weighted data quality score (0-100).
 */
export function calculateDataQuality(
  entries: { dataQualityFlag: DataQuality; totalCo2eTonnes?: number }[]
): DataQualityScore {
  if (entries.length === 0) {
    return {
      overall: 0,
      grade: 'Needs Improvement',
      breakdown: { primary: 0, secondary: 0, estimated: 0, total: 0 },
      recommendations: ['No data entries to assess.'],
    };
  }

  let primary = 0, secondary = 0, estimated = 0;
  let weightedSum = 0;
  const maxWeight = DATA_QUALITY_WEIGHTS.PRIMARY;

  for (const entry of entries) {
    switch (entry.dataQualityFlag) {
      case 'PRIMARY': primary++; break;
      case 'SECONDARY': secondary++; break;
      case 'ESTIMATED': estimated++; break;
    }
    weightedSum += DATA_QUALITY_WEIGHTS[entry.dataQualityFlag] || 1;
  }

  const overall = Math.round((weightedSum / (entries.length * maxWeight)) * 100);

  let grade: DataQualityScore['grade'];
  if (overall >= 80) grade = 'Excellent';
  else if (overall >= 60) grade = 'Good';
  else if (overall >= 40) grade = 'Fair';
  else grade = 'Needs Improvement';

  const recommendations: string[] = [];
  if (estimated > 0) {
    recommendations.push(
      `${estimated} data point(s) are spend-based estimates. Replace with actual quantity data (purchase records, meter readings) to improve accuracy.`
    );
  }
  if (primary === 0) {
    recommendations.push(
      'No primary (metered) data. Consider installing meters or using direct measurement for key emission sources.'
    );
  }
  if (overall < 60) {
    recommendations.push(
      'Overall data quality is below recommended threshold. Focus on obtaining quantity-based data for the largest emission sources first.'
    );
  }

  return {
    overall,
    grade,
    breakdown: { primary, secondary, estimated, total: entries.length },
    recommendations,
  };
}
