/**
 * @claude-tokens-tracker/core — conversation.js
 *
 * Turns a claude.ai conversation-tree payload into a context-token estimate
 * and a cache-expiry time. Walks the *active branch* (current leaf back to
 * root) and counts only observable, billable content — text and tool blocks —
 * skipping thinking, images and documents (which aren't plain-text countable).
 *
 * Logic adapted (MIT) from she-llac/claude-counter's tokens.js.
 */

import { countTokens } from './tokenizer.js';
import { CACHE_WINDOW_MS } from './limits.js';

const ROOT_MESSAGE_ID = '00000000-0000-4000-8000-000000000000';

/** Deterministic stringify so tool payloads count stably. */
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

/** Reconstruct the active branch (root → leaf order). */
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

/**
 * @typedef {Object} ConversationMetrics
 * @property {number} trunkMessageCount
 * @property {number} totalTokens          Approximate context tokens in use.
 * @property {number|null} lastAssistantMs
 * @property {number|null} cachedUntil      ms epoch the cache expires, or null.
 */

/**
 * @param {any} conversation conversation-tree JSON from claude.ai
 * @returns {ConversationMetrics}
 */
export function computeConversationMetrics(conversation) {
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
