/**
 * Theme-aware constants for Recharts components.
 * Uses CSS custom properties so charts adapt to light/dark mode.
 */

export const chartTheme = {
  /** Tick text fill for primary axis labels */
  tickFill: 'var(--color-foreground)',
  /** Tick text fill for secondary axis labels */
  tickFillMuted: 'var(--color-muted-foreground)',
  /** CartesianGrid stroke */
  gridStroke: 'var(--color-border)',
  /** Tooltip styles */
  tooltipStyle: {
    borderRadius: '10px',
    boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
    padding: '10px 14px',
    backgroundColor: 'var(--color-card, white)',
    border: '1px solid var(--color-border)',
  } as React.CSSProperties,
  /** Common tick props */
  xAxisTick: { fontSize: 11, fill: 'var(--color-foreground)' },
  yAxisTick: { fontSize: 11, fill: 'var(--color-muted-foreground)' },

  /** Scope colors — recommendations before/after chart */
  scope: {
    scope1: 'var(--chart-scope1)',
    scope2: 'var(--chart-scope2)',
    scope3: 'var(--chart-scope3)',
  },

  /** Scope colors — dashboard charts (different palette) */
  scopeDashboard: {
    scope1: 'var(--chart-scope1-dashboard)',
    scope2: 'var(--chart-scope2-dashboard)',
    scope3: 'var(--chart-scope3-dashboard)',
  },

  /** Priority tier colors */
  tier: {
    quickWin: 'var(--chart-tier-quickwin)',
    strategic: 'var(--chart-tier-strategic)',
    easyWin: 'var(--chart-tier-easywin)',
    lowPriority: 'var(--chart-tier-lowpriority)',
  },

  /** Before/after & waterfall accent colors */
  beforeAfter: {
    baseline: 'var(--chart-baseline)',
    after: 'var(--chart-after)',
    trend: 'var(--chart-trend)',
  },

  /** Accent colors for various chart elements */
  accent: {
    facility: 'var(--chart-facility)',
    savingsArea: 'var(--chart-savings-area)',
    savingsLine: 'var(--chart-savings-line)',
    capexLine: 'var(--chart-capex-line)',
    paybackLine: 'var(--chart-payback-line)',
  },

  /** Monospace font for numeric axis ticks */
  fontMono: 'var(--font-mono)',
} as const;
