"use client";

import { useMemo, useState } from "react";

import rawRows from "../data/daily-burn.sample.json";
import {
  exactColumns,
  estimateBand,
  getAdaptiveHeadline,
  normalizeRows,
  sumActivity,
  sumExact,
  type BurnRow,
} from "../lib/burn-data";
import { getWindowRows, type WindowKey, windows } from "../lib/date-windows";
import {
  formatBand,
  formatTokens,
  logHeatLevel,
  movingAverage7,
  sameDayActivity,
  sumExactTotal,
  topNDays,
  weeklyTotals,
} from "../lib/token-math";

const rows = normalizeRows(rawRows);

export default function TokenBurnDashboard() {
  const [windowKey, setWindowKey] = useState<WindowKey>("180");

  const selectedRows = useMemo(() => getWindowRows(rows, windowKey), [windowKey]);
  const exactTotal = sumExactTotal(selectedRows);
  const hasExact = exactTotal > 0;
  const { low: estLow, high: estHigh } = estimateBand(selectedRows);
  const headline = getAdaptiveHeadline(selectedRows);
  const maxDay = Math.max(...selectedRows.map((row) => row.exact_total), 0);
  const peakDay = selectedRows.reduce<BurnRow | undefined>(
    (peak, row) => (!peak || row.exact_total > peak.exact_total ? row : peak),
    undefined,
  );
  const lastAverage =
    selectedRows.length > 0 ? movingAverage7(selectedRows, selectedRows.length - 1) : 0;
  const totalMessages =
    sumActivity(selectedRows, "chatgpt_messages") +
    sumActivity(selectedRows, "claude_chat_messages");
  const drivers = buildDriverRows(selectedRows, exactTotal);
  const weekly = weeklyTotals(selectedRows);
  const path = buildTrendPath(weekly.map((week) => week.total));
  const topDays = topNDays(selectedRows, 10).filter((day) => day.total > 0);
  const today =
    selectedRows.length > 0
      ? sameDayActivity(selectedRows, selectedRows[selectedRows.length - 1].date)
      : null;
  const tableRows = selectedRows.slice(-30).reverse();

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Token burn dashboard</p>
          <h1>AI usage by day, source, and work driver.</h1>
          <p className="lead">
            This dashboard keeps exact measurements, activity counts, and estimates in
            separate lanes. It never adds a guess to a measured number. The question is
            always the same. What should the computer do next?
          </p>
        </div>
        <div className="range" aria-label="Select time range">
          {windows.map((windowOption) => (
            <button
              key={windowOption.key}
              type="button"
              aria-pressed={windowKey === windowOption.key}
              onClick={() => setWindowKey(windowOption.key)}
            >
              {windowOption.label}
            </button>
          ))}
        </div>
      </section>

      <section className="stats" aria-label="Token burn summary">
        <Metric
          label={headline.primary.label}
          value={headline.primary.value}
          note={headline.type === "exact" ? "measured" : "see fidelity"}
        />
        {headline.secondary && (
          <Metric label={headline.secondary.label} value={headline.secondary.value} note="" />
        )}
        {hasExact ? (
          <>
            <Metric
              label="Peak day"
              value={formatTokens(peakDay?.exact_total || 0)}
              note={peakDay?.date || "n/a"}
            />
            <Metric label="7d average" value={formatTokens(lastAverage)} note="exact, moving avg" />
          </>
        ) : (
          <>
            <Metric label="Messages" value={`${totalMessages}`} note="measured activity" />
            <Metric label="Active days" value={`${selectedRows.length}`} note="rows in view" />
          </>
        )}
      </section>

      <section className="fidelityLegend" aria-label="Fidelity legend">
        <span className="legendLabel">How we know each number</span>
        <span className="pill exact">measured</span>
        <span className="pill floor">floor estimate</span>
        <span className="pill rough">rough estimate</span>
      </section>

      <section className="grid">
        <Panel
          label="Daily burn"
          title="Heatmap"
          note="Log color scale, by exact tokens. Quiet days and spikes share one surface."
        >
          {hasExact ? (
            <>
              <div className="heatmap" aria-label="Daily token burn heatmap">
                {selectedRows.map((row) => (
                  <span
                    key={row.date}
                    className={`cell heat${logHeatLevel(row.exact_total, maxDay)}`}
                    title={`${row.date}: ${formatTokens(row.exact_total)} tokens exact, ${row.driver}`}
                  />
                ))}
              </div>
              <div className="legend" aria-hidden>
                <span>less</span>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <i key={level} className={`heat${level}`} />
                ))}
                <span>more</span>
              </div>
            </>
          ) : (
            <EmptyExact />
          )}
        </Panel>

        <Panel
          label="Weekly trend"
          title="Log-scaled trend"
          note="Exact tokens by week. A smooth read on whether usage is climbing or getting leaner."
        >
          {hasExact ? (
            <div className="trend">
              <svg viewBox="0 0 720 260" role="img" aria-label="Weekly token burn trend line">
                <path d="M30 40H690M30 120H690M30 200H690" stroke="rgba(240,236,228,0.12)" />
                <path
                  d={path}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            <EmptyExact />
          )}
        </Panel>
      </section>

      <section className="grid">
        <Panel
          label="Model distribution"
          title="Exact beside estimated"
          note="Measured usage by tool. The chat estimate is a labeled band, kept separate."
        >
          <div className="sourceGrid">
            {exactColumns.map((col) => {
              const value = sumExact(selectedRows, col.key);
              const share = exactTotal ? Math.round((value / exactTotal) * 100) : 0;
              return (
                <div key={col.key} className="source">
                  <span className="pill exact">exact</span>
                  <strong>{formatTokens(value)}</strong>
                  <span className="muted">
                    {col.label} / {share}%
                  </span>
                </div>
              );
            })}
            {estLow > 0 && (
              <div className="source">
                <span className="pill rough">estimate</span>
                <strong>{formatBand(estLow, estHigh)}</strong>
                <span className="muted">Chat, not measured</span>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          label="Drivers"
          title="What is burning tokens"
          note="Grouped by exact tokens. Keep driver labels boring and consistent."
        >
          <div className="driverGrid">
            {drivers.map((driver) => (
              <div key={driver.label} className="driver">
                <strong>{driver.label}</strong>
                <span className="track">
                  <i style={{ width: `${driver.share}%` }} />
                </span>
                <span>{driver.share}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid">
        <Panel
          label="Top days"
          title="Peak burn days"
          note="Ranked by exact tokens, with what drove each."
        >
          {topDays.length > 0 ? (
            <div className="topDaysGrid">
              {topDays.map((day) => (
                <div key={day.date} className="topDayRow">
                  <span className="date">{day.date}</span>
                  <span className="total">{formatTokens(day.total)}</span>
                  <span className="driver">{day.driver}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyExact />
          )}
        </Panel>

        <Panel
          label="Same-day strip"
          title={today?.date || "No data"}
          note={today ? `Driver: ${today.driver}` : "Current day breakdown."}
        >
          {today ? (
            <div className="sourceGrid">
              <Metric label="Exact tokens" value={formatTokens(today.exact)} note="measured" />
              <Metric label="Conversations" value={`${today.convos}`} note="measured" />
              <Metric label="Codex" value={formatTokens(today.codex)} note="exact" />
              <Metric label="Claude Code" value={formatTokens(today.claudeCode)} note="exact" />
            </div>
          ) : (
            <EmptyExact />
          )}
        </Panel>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="label">Moving-average table</p>
            <h2>Last 30 days</h2>
          </div>
          <p>Exact tokens, measured activity, and the estimate band stay in separate columns.</p>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Exact total</th>
                <th>7d avg</th>
                <th>Codex</th>
                <th>Claude Code</th>
                <th>Convos</th>
                <th>Messages</th>
                <th>Chat est.</th>
                <th>Driver</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const originalIndex = selectedRows.findIndex(
                  (candidate) => candidate.date === row.date,
                );
                const hasBand = row.chat_tokens_low + row.chat_tokens_high > 0;
                return (
                  <tr key={row.date}>
                    <td>
                      <strong>{row.date}</strong>
                    </td>
                    <td>
                      <span className="pill exact">{formatTokens(row.exact_total)}</span>
                    </td>
                    <td>{formatTokens(movingAverage7(selectedRows, originalIndex))}</td>
                    <td>{formatTokens(row.codex_tokens)}</td>
                    <td>{formatTokens(row.claude_code_tokens)}</td>
                    <td>{row.chatgpt_conversations + row.claude_chat_conversations}</td>
                    <td>{row.chatgpt_messages + row.claude_chat_messages}</td>
                    <td>
                      {hasBand ? (
                        <span className="pill rough">
                          {formatBand(row.chat_tokens_low, row.chat_tokens_high)}
                        </span>
                      ) : (
                        <span className="muted">none</span>
                      )}
                    </td>
                    <td>{row.driver}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="footerNote">
        Replace <code>data/daily-burn.sample.json</code> with your normalized daily rows.
        Exact tokens come from logs. Activity counts come from exports. Chat token estimates
        are a labeled band, never a measured number. Keep raw exports and private project
        names out of anything you deploy or share.
      </p>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function Panel({
  label,
  title,
  note,
  children,
}: {
  label: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel">
      <div className="panelHeader">
        <div>
          <p className="label">{label}</p>
          <h2>{title}</h2>
        </div>
        <p>{note}</p>
      </div>
      {children}
    </article>
  );
}

function EmptyExact() {
  return (
    <div className="emptyExact">
      <p>No exact token logs in this view.</p>
      <p className="muted">
        Chat usage shows up as measured activity and a labeled estimate band, not as exact
        tokens.
      </p>
    </div>
  );
}

function buildDriverRows(selectedRows: BurnRow[], total: number) {
  const totals = new Map<string, number>();

  for (const row of selectedRows) {
    totals.set(row.driver, (totals.get(row.driver) || 0) + row.exact_total);
  }

  return Array.from(totals, ([label, value]) => ({
    label,
    value,
    share: total ? Math.round((value / total) * 100) : 0,
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildTrendPath(values: number[]) {
  if (values.length === 0) return "";

  const width = 660;
  const height = 190;
  const left = 30;
  const top = 35;
  const max = Math.max(...values, 1);

  const points = values.map((value, index) => {
    const x = left + (values.length === 1 ? width / 2 : (index / (values.length - 1)) * width);
    const normalized = Math.log10(value + 1) / Math.log10(max + 1);
    const y = top + height - normalized * height;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return `M${points.join(" L")}`;
}
