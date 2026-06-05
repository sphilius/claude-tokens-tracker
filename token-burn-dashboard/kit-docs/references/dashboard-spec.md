# Dashboard Spec

Build one local dashboard over normalized daily rows. Keep exact tokens, measured activity, and
estimate bands in separate lanes. Never add a guess to a measured number.

## Adaptive headline

The top metric leads with whatever is actually measured.

- Exact-dominant data leads with `exact_total`.
- Chat-only or activity-dominant data leads with conversation and message counts, and shows the
  token estimate as a labeled band.
- Estimate-only data leads with the band, labeled rough.

## Required views

1. Daily burn heatmap
   - Color by `exact_total` on a logarithmic scale so quiet days still read.
   - Show date, exact total, and driver on hover or focus.
   - If there is no exact data in view, show an honest empty state, not a flat grid pretending
     to be data.

2. Weekly trend
   - Sum `exact_total` by ISO week, plotted log-normalized.

3. Model distribution
   - Show exact sources (Codex, Claude Code, API) each labeled `exact`.
   - Show the chat estimate as a separate band labeled `estimate`.
   - Never merge exact and estimate into one total.

4. Burn drivers
   - Group by `driver`, sort descending by `exact_total`, show percent share.

5. Top days
   - Rank by `exact_total`, show date, total, and driver for each.

6. Same-day strip
   - The current day broken down by source, including activity counts.

7. Moving-average table
   - Last 30 rows. Columns for exact total, 7-day average, each exact source, activity counts,
     the estimate band, and driver. Every number carries its fidelity.

8. Fidelity legend
   - A persistent legend, measured / floor / rough, plus per-number pills.

## Controls

- One range control. 90 days, 180 days, 1 year, all-time. The range affects every view.
- Keep the dashboard responsive on phone widths.

## Views removed

- Scale equivalents. The "approximate words, reading time, novel equivalents" panel is removed.
  Do not translate tokens into novels, and never run that math on mixed or estimated data.

## Verification

- Add one day by hand and confirm totals update.
- Pick one day and reconcile `exact_total` against the exact source columns.
- Confirm fidelity labels are visible in every view.
- Confirm estimates render as bands, never point values.
- Confirm the log heatmap shows both small days and spikes.
- Build locally before deploying.
