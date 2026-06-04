/**
 * @claude-tokens-tracker/core — net.js
 *
 * Page-context network glue: identify the org/conversation and observe
 * claude.ai's own traffic. Designed for an environment where the code runs in
 * the page (a userscript with `@grant none`, or an MV3 page-injected bridge),
 * so it can wrap `window.fetch` directly.
 *
 * It never originates traffic except the explicit `fetchUsage` call elsewhere;
 * here we only *observe* responses claude.ai already makes. SSE/stream parsing
 * adapted (MIT) from she-llac/claude-counter's bridge.js.
 */

/** Read the active org id from the `lastActiveOrg` cookie. */
export function getOrgIdFromCookie() {
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

/** Extract the conversation id from the current URL, or null on home/new. */
export function getConversationId() {
  const m = window.location.pathname.match(/\/chat\/([^/?]+)/);
  return m ? m[1] : null;
}

function toAbsoluteUrl(input) {
  if (typeof input === 'string') return input.startsWith('/') ? `https://claude.ai${input}` : input;
  if (input instanceof URL) return input.href;
  if (input && typeof input.url === 'string') return input.url; // Request
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
          /* ignore non-JSON frames */
        }
      }
    }
  } catch {
    /* best-effort; never break claude.ai */
  }
}

/**
 * Wrap `window.fetch` to observe completions, usage SSE frames, and
 * conversation-tree loads. Returns an uninstall function.
 *
 * @param {Object} handlers
 * @param {() => void} [handlers.onGenerationStart]
 * @param {(messageLimit: any) => void} [handlers.onMessageLimit]
 * @param {(meta: {orgId:string, conversationId:string}, data:any) => void} [handlers.onConversation]
 * @returns {() => void}
 */
export function installFetchInterceptor({ onGenerationStart, onMessageLimit, onConversation } = {}) {
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
    if (onMessageLimit && contentType.includes('event-stream')) {
      pumpEventStream(response, onMessageLimit);
    }

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
