/**
 * Claude API integration.
 *
 * Calls the Anthropic Messages API directly from the browser using the
 * `anthropic-dangerous-direct-browser-access` header. This is appropriate for a
 * local/demo tool where the user supplies their own key; in a production app the
 * key would live server-side behind a proxy.
 *
 * If no API key is configured, callers fall back to `demo.js` so the app is fully
 * usable with zero setup.
 */

const API_URL = "https://api.anthropic.com/v1/messages";

// Default model. See https://docs.claude.com for the current lineup.
export const MODEL = "claude-opus-4-8";

/**
 * Stream a completion from Claude.
 *
 * @param {object} opts
 * @param {string} opts.apiKey        Anthropic API key.
 * @param {string} [opts.system]      System prompt.
 * @param {Array}  opts.messages      Messages array ([{role, content}]).
 * @param {number} [opts.maxTokens]   Max output tokens.
 * @param {AbortSignal} [opts.signal] Abort signal to cancel the stream.
 * @returns {AsyncGenerator<string>}  Yields incremental text deltas.
 */
export async function* streamClaude({
  apiKey,
  system,
  messages,
  maxTokens = 4000,
  signal,
}) {
  const res = await fetch(API_URL, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      // Adaptive thinking lets the model decide how much to reason per request.
      thinking: { type: "adaptive" },
      stream: true,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      `Claude API error (${res.status}): ${detail || res.statusText}`
    );
  }

  // Parse the Server-Sent Events stream.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) continue;

      const json = dataLine.slice(5).trim();
      if (!json) continue;

      let payload;
      try {
        payload = JSON.parse(json);
      } catch {
        continue;
      }

      // We only care about visible text deltas — ignore thinking deltas so the
      // model's reasoning doesn't leak into the document.
      if (
        payload.type === "content_block_delta" &&
        payload.delta?.type === "text_delta"
      ) {
        yield payload.delta.text;
      } else if (
        payload.type === "message_delta" &&
        payload.delta?.stop_reason === "refusal"
      ) {
        throw new Error(
          "The model declined this request for safety reasons. Try rephrasing."
        );
      }
    }
  }
}
