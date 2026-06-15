/**
 * @claude-tokens-tracker/core — usage.js
 *
 * Normalises Claude's account usage into a single shape regardless of source:
 *   - the `/api/organizations/{org}/usage` REST endpoint, and
 *   - the live SSE `message_limit` frames emitted during a completion.
 *
 * The SSE path gives the raw, *unrounded* utilization fraction, so it is more
 * precise than the rounded percentages on claude.ai/settings/usage. Parsing
 * shapes are adapted (MIT) from she-llac/claude-counter and lugia19's
 * Claude-Usage-Extension — see THIRD_PARTY_NOTICES.md.
 *
 * @typedef {Object} UsageWindow
 * @property {number} utilization   Percent used, 0–100.
 * @property {string|null} resets_at ISO-8601 reset time, or null.
 * @property {number} window_hours  Nominal window length in hours (5 or 168).
 *
 * @typedef {Object} UsageSnapshot
 * @property {UsageWindow|null} five_hour
 * @property {UsageWindow|null} seven_day
 */

const clampPct = (n) => Math.max(0, Math.min(100, n));

/**
 * Parse the REST `/usage` payload. Shape:
 *   { five_hour: { utilization: 0..100, resets_at: ISO }, seven_day: {...} }
 * @param {any} raw
 * @returns {UsageSnapshot|null}
 */
export function parseUsageFromUsageEndpoint(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const normalize = (w, hours) => {
    if (!w || typeof w !== 'object') return null;
    if (typeof w.utilization !== 'number' || !Number.isFinite(w.utilization)) return null;
    return {
      utilization: clampPct(w.utilization),
      resets_at: typeof w.resets_at === 'string' ? w.resets_at : null,
      window_hours: hours,
    };
  };

  const five_hour = normalize(raw.five_hour, 5);
  const seven_day = normalize(raw.seven_day, 24 * 7);
  if (!five_hour && !seven_day) return null;
  return { five_hour, seven_day };
}

/**
 * Parse an SSE `message_limit` frame. Shape:
 *   { windows: { '5h': { utilization: 0..1, resets_at: <unix s> }, '7d': {...} } }
 * Note utilization is a 0–1 fraction and resets_at is unix *seconds*.
 * @param {any} raw
 * @returns {UsageSnapshot|null}
 */
export function parseUsageFromMessageLimit(raw) {
  if (!raw || typeof raw.windows !== 'object' || !raw.windows) return null;

  const normalize = (w, hours) => {
    if (!w || typeof w !== 'object') return null;
    if (typeof w.utilization !== 'number' || !Number.isFinite(w.utilization)) return null;
    const resets_at =
      typeof w.resets_at === 'number' && Number.isFinite(w.resets_at)
        ? new Date(w.resets_at * 1000).toISOString()
        : null;
    return { utilization: clampPct(w.utilization * 100), resets_at, window_hours: hours };
  };

  const five_hour = normalize(raw.windows['5h'], 5);
  const seven_day = normalize(raw.windows['7d'], 24 * 7);
  if (!five_hour && !seven_day) return null;
  return { five_hour, seven_day };
}

/**
 * Human-readable countdown to a reset timestamp (ms epoch).
 * @param {number|null} resetMs
 * @returns {string} e.g. "1h 22m", "44m", "now"
 */
export function formatResetCountdown(resetMs) {
  if (!resetMs) return '';
  const remaining = resetMs - Date.now();
  if (remaining <= 0) return 'now';
  const totalMin = Math.floor(remaining / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Fetch and parse the account usage snapshot for an org. Uses the existing
 * claude.ai session cookie (credentials: 'include'); makes no other call.
 * @param {string} orgId
 * @param {typeof fetch} [fetchImpl] inject the un-wrapped fetch if needed
 * @returns {Promise<UsageSnapshot|null>}
 */
export async function fetchUsage(orgId, fetchImpl = fetch) {
  if (!orgId) return null;
  const res = await fetchImpl(`https://claude.ai/api/organizations/${orgId}/usage`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) return null;
  return parseUsageFromUsageEndpoint(await res.json());
}
