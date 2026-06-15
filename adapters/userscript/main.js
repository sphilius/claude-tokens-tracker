/**
 * claude-tokens-tracker — userscript adapter
 *
 * Thin surface over @claude-tokens-tracker/core. Renders a small, fixed,
 * local-only panel on claude.ai showing: context tokens vs 200k, prompt-cache
 * countdown, and exact (unrounded) session / weekly usage with reset timers.
 *
 * Lead delivery vehicle because it's the one codebase that covers desktop
 * Chrome/Firefox *and* the Android path (Kiwi / Firefox-Android / userscript
 * managers). All counting happens locally; the only network the script does is
 * read your own /usage via your existing claude.ai session.
 */

import {
  CONTEXT_LIMIT_TOKENS,
  countTokens, // re-exported so the bundle keeps it tree-shake-safe
  isExactTokenizerAvailable,
  computeConversationMetrics,
  parseUsageFromMessageLimit,
  fetchUsage,
  formatResetCountdown,
  getOrgIdFromCookie,
  getConversationId,
  installFetchInterceptor,
} from '../../src/core/index.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  orgId: null,
  conversationId: null,
  usage: null, // UsageSnapshot
  context: { totalTokens: null, cachedUntil: null },
};

// ---------------------------------------------------------------------------
// UI — a single fixed panel (robust against claude.ai DOM churn)
// ---------------------------------------------------------------------------
const PANEL_ID = 'ctt-panel';

function injectStyles() {
  if (document.getElementById('ctt-style')) return;
  const css = `
    #${PANEL_ID}{position:fixed;z-index:2147483000;bottom:16px;right:16px;
      font:12px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;
      color:#e8e8e6;background:rgba(30,30,30,.92);backdrop-filter:blur(6px);
      border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;
      min-width:190px;box-shadow:0 4px 20px rgba(0,0,0,.35);user-select:none}
    @media (prefers-color-scheme: light){#${PANEL_ID}{background:rgba(252,252,250,.95);
      color:#1f1f1d;border-color:rgba(0,0,0,.10);box-shadow:0 4px 20px rgba(0,0,0,.12)}}
    #${PANEL_ID} .ctt-hdr{display:flex;justify-content:space-between;align-items:center;
      gap:8px;margin-bottom:8px;font-weight:600;letter-spacing:.02em}
    #${PANEL_ID} .ctt-collapse{cursor:pointer;opacity:.6;font-size:13px}
    #${PANEL_ID} .ctt-row{margin:6px 0}
    #${PANEL_ID} .ctt-label{display:flex;justify-content:space-between;gap:8px;opacity:.85}
    #${PANEL_ID} .ctt-bar{height:5px;border-radius:3px;background:rgba(128,128,128,.3);
      margin-top:3px;overflow:hidden}
    #${PANEL_ID} .ctt-fill{height:100%;width:0;background:#5aa6ff;transition:width .3s ease}
    #${PANEL_ID} .ctt-fill.warn{background:#e8a33d}
    #${PANEL_ID} .ctt-fill.full{background:#ce2029}
    #${PANEL_ID}.ctt-collapsed .ctt-body{display:none}
    #${PANEL_ID} .ctt-muted{opacity:.55;font-size:11px;margin-top:6px}
  `;
  const style = document.createElement('style');
  style.id = 'ctt-style';
  style.textContent = css;
  document.head.appendChild(style);
}

function row(label, valueId, barId) {
  return `<div class="ctt-row">
    <div class="ctt-label"><span>${label}</span><span id="${valueId}">—</span></div>
    <div class="ctt-bar"><div class="ctt-fill" id="${barId}"></div></div>
  </div>`;
}

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;
  injectStyles();
  panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="ctt-hdr"><span>Tokens · Usage</span><span class="ctt-collapse" title="Collapse">▾</span></div>
    <div class="ctt-body">
      ${row('Context', 'ctt-ctx-val', 'ctt-ctx-bar')}
      ${row('Session (5h)', 'ctt-sess-val', 'ctt-sess-bar')}
      ${row('Weekly (7d)', 'ctt-week-val', 'ctt-week-bar')}
      <div class="ctt-muted" id="ctt-cache"></div>
    </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.ctt-collapse').addEventListener('click', () => {
    panel.classList.toggle('ctt-collapsed');
  });
  return panel;
}

function setBar(barId, pct) {
  const el = document.getElementById(barId);
  if (!el) return;
  const width = Math.max(0, Math.min(100, pct));
  el.style.width = `${width}%`;
  el.classList.toggle('warn', width >= 80 && width < 95);
  el.classList.toggle('full', width >= 95);
}

function render() {
  ensurePanel();

  // Context
  const ctx = state.context.totalTokens;
  const ctxVal = document.getElementById('ctt-ctx-val');
  if (ctxVal) {
    if (ctx == null) {
      ctxVal.textContent = '—';
      setBar('ctt-ctx-bar', 0);
    } else {
      const approx = isExactTokenizerAvailable() ? '' : '~';
      const k = (ctx / 1000).toFixed(ctx >= 10000 ? 0 : 1);
      ctxVal.textContent = `${approx}${k}k / 200k`;
      setBar('ctt-ctx-bar', (ctx / CONTEXT_LIMIT_TOKENS) * 100);
    }
  }

  // Usage windows
  const renderWindow = (w, valId, barId, hours) => {
    const valEl = document.getElementById(valId);
    if (!valEl) return;
    if (!w) {
      valEl.textContent = '—';
      setBar(barId, 0);
      return;
    }
    const resetMs = w.resets_at ? Date.parse(w.resets_at) : null;
    const reset = resetMs ? ` · ${formatResetCountdown(resetMs)}` : '';
    valEl.textContent = `${w.utilization.toFixed(0)}%${reset}`;
    setBar(barId, w.utilization);
  };
  renderWindow(state.usage?.five_hour, 'ctt-sess-val', 'ctt-sess-bar', 5);
  renderWindow(state.usage?.seven_day, 'ctt-week-val', 'ctt-week-bar', 168);

  // Cache line
  const cacheEl = document.getElementById('ctt-cache');
  if (cacheEl) {
    const until = state.context.cachedUntil;
    if (until && until > Date.now()) {
      cacheEl.textContent = `Cached for ${formatResetCountdown(until)}`;
    } else {
      cacheEl.textContent = '';
    }
  }
}

// ---------------------------------------------------------------------------
// Data wiring
// ---------------------------------------------------------------------------
let usageFetchInFlight = false;

async function refreshUsage() {
  const orgId = state.orgId || getOrgIdFromCookie();
  if (!orgId || usageFetchInFlight) return;
  state.orgId = orgId;
  usageFetchInFlight = true;
  try {
    const snapshot = await fetchUsage(orgId);
    if (snapshot) {
      state.usage = snapshot;
      render();
    }
  } catch {
    /* ignore */
  } finally {
    usageFetchInFlight = false;
  }
}

function onConversation(meta, data) {
  if (!data || meta.conversationId !== state.conversationId) return;
  state.orgId = meta.orgId || state.orgId;
  const metrics = computeConversationMetrics(data);
  state.context = { totalTokens: metrics.totalTokens, cachedUntil: metrics.cachedUntil };
  render();
}

function onMessageLimit(messageLimit) {
  const snapshot = parseUsageFromMessageLimit(messageLimit);
  if (snapshot) {
    state.usage = snapshot;
    render();
  }
}

function onUrlChange() {
  state.conversationId = getConversationId();
  if (!state.conversationId) {
    state.context = { totalTokens: null, cachedUntil: null };
  }
  state.orgId = state.orgId || getOrgIdFromCookie();
  render();
  if (!state.usage) refreshUsage();
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
function start() {
  ensurePanel();
  render();

  installFetchInterceptor({ onMessageLimit, onConversation });

  // SPA navigation: claude.ai uses pushState; poll the path cheaply.
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      onUrlChange();
    }
  }, 1000);
  window.addEventListener('popstate', onUrlChange);

  onUrlChange();
  refreshUsage();

  // Keep reset countdowns and cache timer live.
  setInterval(render, 1000);
}

if (document.body) start();
else window.addEventListener('DOMContentLoaded', start);
