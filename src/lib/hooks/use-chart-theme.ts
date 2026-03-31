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
} as const;
