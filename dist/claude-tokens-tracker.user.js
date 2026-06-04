// ==UserScript==
// @name         Claude Tokens Tracker
// @namespace    https://github.com/sphilius/claude-tokens-tracker
// @version      0.1.0
// @description  Local, private context-token count + exact session/weekly usage and cache timer on claude.ai. Works on desktop and Android (via a userscript-capable browser).
// @author       sphilius
// @match        https://claude.ai/*
// @run-at       document-idle
// @grant        none
// @noframes
// @license      MIT
// @homepageURL  https://github.com/sphilius/claude-tokens-tracker
// @supportURL   https://github.com/sphilius/claude-tokens-tracker/issues
// ==/UserScript==
//
// For EXACT o200k token counting (instead of the built-in heuristic), add this
// line to the metadata block above — it loads the MIT gpt-tokenizer at install
// time (a one-off CDN fetch, not runtime telemetry):
//   // @require https://cdn.jsdelivr.net/npm/gpt-tokenizer@2/dist/o200k_base.js
//
// GENERATED FILE — checked in for one-click install. The maintained source is
// src/core/*.js + adapters/userscript/main.js; rebuild with `npm run build:userscript`.
//
// Token/usage/SSE logic adapted (MIT) from she-llac/claude-counter and
// lugia19/Claude-Usage-Extension. See THIRD_PARTY_NOTICES.md.

(() => {
  'use strict';

  // === limits ============================================================
  const CONTEXT_LIMIT_TOKENS = 200000;
  const CACHE_WINDOW_MS = 5 * 60 * 1000;

  // === tokenizer (pluggable: exact o200k via @require, else heuristic) ===
  function exactTokenizer() {
    const t = globalThis.GPTTokenizer_o200k_base;
    return t && typeof t.countTokens === 'function' ? t : null;
  }
  function isExactTokenizerAvailable() {
    return exactTokenizer() != null;
  }
  function heuristicCount(text) {
    if (!text) return 0;
    const byChars = text.length / 3.7;
    const pieces = text.match(/[A-Za-z0-9]+|[^\sA-Za-z0-9]/g);
    return Math.ceil(Math.max(byChars, pieces ? pieces.length : 0));
  }
  function countTokens(text) {
    if (!text) return 0;
    const exact = exactTokenizer();
    if (exact) {
      try {
        return exact.countTokens(text);
      } catch {
        /* fall through */
      }
    }
    return heuristicCount(text);
  }

  // === usage parsing =====================================================
  const clampPct = (n) => Math.max(0, Math.min(100, n));

  function parseUsageFromUsageEndpoint(raw) {
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

  function parseUsageFromMessageLimit(raw) {
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

  function formatResetCountdown(resetMs) {
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

  async function fetchUsage(orgId) {
    if (!orgId) return null;
    const res = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return parseUsageFromUsageEndpoint(await res.json());
  }

  // === conversation metrics ==============================================
  const ROOT_MESSAGE_ID = '00000000-0000-4000-8000-000000000000';

  function stableStringify(value) {
    const seen = new WeakSet();
    const normalize = (v) => {
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      if (Array.isArray(v)) return v.map(normalize);
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = normalize(v[key]);
      return out;
    };
    try {
      return JSON.stringify(normalize(value));
    } catch {
      return '';
    }
  }
  function buildTrunk(conversation) {
    const messages = Array.isArray(conversation?.chat_messages) ? conversation.chat_messages : [];
    const byId = new Map();
    for (const msg of messages) if (msg?.uuid) byId.set(msg.uuid, msg);
    const leaf = conversation?.current_leaf_message_uuid;
    if (!leaf) return [];
    const trunk = [];
    let currentId = leaf;
    while (currentId && currentId !== ROOT_MESSAGE_ID) {
      const msg = byId.get(currentId);
      if (!msg) break;
      trunk.push(msg);
      currentId = msg.parent_message_uuid;
    }
    trunk.reverse();
    return trunk;
  }
  function isCountable(item) {
    if (!item || typeof item !== 'object' || typeof item.type !== 'string') return false;
    return !['thinking', 'redacted_thinking', 'image', 'document'].includes(item.type);
  }
  function stringifyContentItem(item) {
    if (!isCountable(item)) return '';
    if (item.type === 'text' && typeof item.text === 'string') return item.text;
    if (item.type === 'tool_use') return stableStringify({ id: item.id, name: item.name, input: item.input });
    if (item.type === 'tool_result')
      return stableStringify({ tool_use_id: item.tool_use_id, is_error: item.is_error, content: item.content });
    const minimal = {};
    for (const k of ['text', 'title', 'url', 'content']) if (item[k] != null) minimal[k] = item[k];
    return Object.keys(minimal).length ? stableStringify(minimal) : '';
  }
  function stringifyMessage(message) {
    const parts = [];
    const content = Array.isArray(message?.content) ? message.content : [];
    for (const item of content) {
      const s = stringifyContentItem(item);
      if (s) parts.push(s);
    }
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    for (const a of attachments) {
      if (typeof a?.extracted_content === 'string' && a.extracted_content) parts.push(a.extracted_content);
    }
    return parts.join('\n');
  }
  function computeConversationMetrics(conversation) {
    const trunk = buildTrunk(conversation);
    let totalTokens = 0;
    let lastAssistantMs = null;
    for (const msg of trunk) {
      if (msg?.sender === 'assistant' && msg?.created_at) {
        const ms = Date.parse(msg.created_at);
        if (!lastAssistantMs || ms > lastAssistantMs) lastAssistantMs = ms;
      }
      totalTokens += countTokens(stringifyMessage(msg));
    }
    return {
      trunkMessageCount: trunk.length,
      totalTokens,
      lastAssistantMs,
      cachedUntil: lastAssistantMs ? lastAssistantMs + CACHE_WINDOW_MS : null,
    };
  }

  // === net (org/conversation + fetch interceptor) ========================
  function getOrgIdFromCookie() {
    try {
      return (
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('lastActiveOrg='))
          ?.split('=')[1] || null
      );
    } catch {
      return null;
    }
  }
  function getConversationId() {
    const m = window.location.pathname.match(/\/chat\/([^/?]+)/);
    return m ? m[1] : null;
  }
  function toAbsoluteUrl(input) {
    if (typeof input === 'string') return input.startsWith('/') ? `https://claude.ai${input}` : input;
    if (input instanceof URL) return input.href;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }
  function conversationMetaFromUrl(url) {
    const m = url.match(/^https:\/\/claude\.ai\/api\/organizations\/([^/]+)\/chat_conversations\/([^/?]+)/);
    return m ? { orgId: m[1], conversationId: m[2] } : null;
  }
  async function pumpEventStream(response, onMessageLimit) {
    try {
      const reader = response.clone().body?.getReader?.();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r\n|\r|\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const json = JSON.parse(raw);
            if (json?.type === 'message_limit' && json.message_limit) onMessageLimit(json.message_limit);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* best-effort */
    }
  }
  function installFetchInterceptor({ onGenerationStart, onMessageLimit, onConversation } = {}) {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = toAbsoluteUrl(args[0]);
      const opts = args[1] || {};
      if (
        onGenerationStart &&
        url &&
        opts.method === 'POST' &&
        (url.includes('/completion') || url.includes('/retry_completion'))
      ) {
        try {
          onGenerationStart();
        } catch {
          /* ignore */
        }
      }
      const response = await originalFetch.apply(window, args);
      const contentType = response.headers.get('content-type') || '';
      if (onMessageLimit && contentType.includes('event-stream')) pumpEventStream(response, onMessageLimit);
      if (onConversation && url && url.includes('/chat_conversations/') && url.includes('tree=')) {
        const meta = conversationMetaFromUrl(url);
        if (meta) {
          response
            .clone()
            .json()
            .then((data) => onConversation(meta, data))
            .catch(() => {});
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }

  // === adapter: state + UI ==============================================
  const state = {
    orgId: null,
    conversationId: null,
    usage: null,
    context: { totalTokens: null, cachedUntil: null },
  };

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
    panel.querySelector('.ctt-collapse').addEventListener('click', () => panel.classList.toggle('ctt-collapsed'));
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
    const renderWindow = (w, valId, barId) => {
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
    renderWindow(state.usage?.five_hour, 'ctt-sess-val', 'ctt-sess-bar');
    renderWindow(state.usage?.seven_day, 'ctt-week-val', 'ctt-week-bar');
    const cacheEl = document.getElementById('ctt-cache');
    if (cacheEl) {
      const until = state.context.cachedUntil;
      cacheEl.textContent = until && until > Date.now() ? `Cached for ${formatResetCountdown(until)}` : '';
    }
  }

  // === adapter: data wiring =============================================
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
    if (!state.conversationId) state.context = { totalTokens: null, cachedUntil: null };
    state.orgId = state.orgId || getOrgIdFromCookie();
    render();
    if (!state.usage) refreshUsage();
  }

  // === bootstrap =========================================================
  function startCtt() {
    ensurePanel();
    render();
    installFetchInterceptor({ onMessageLimit, onConversation });
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
    setInterval(render, 1000);
  }

  if (document.body) startCtt();
  else window.addEventListener('DOMContentLoaded', startCtt);
})();
