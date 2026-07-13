/**
 * System prompt + per-action instruction builders for the writing assistant.
 */

export const SYSTEM_PROMPT = `You are Synapse, an expert writing assistant embedded in a collaborative document editor.
- Return only the requested content — no preamble like "Here is" or "Sure".
- Match the voice and formatting of the surrounding document.
- Prefer concrete, specific language over vague adjectives.
- Use Markdown for any structure (headings, lists, emphasis).`;

/**
 * Quick actions shown in the assistant panel.
 * `needsText: true` means the action operates on the document/selection.
 */
export const ACTIONS = [
  { id: "improve", label: "Improve", icon: "✨", needsText: true },
  { id: "summarize", label: "Summarize", icon: "📝", needsText: true },
  { id: "expand", label: "Expand", icon: "➕", needsText: true },
  { id: "grammar", label: "Fix grammar", icon: "🔤", needsText: true },
  { id: "continue", label: "Continue writing", icon: "✍️", needsText: true },
];

export const TONES = [
  "professional",
  "casual",
  "persuasive",
  "friendly",
  "confident",
  "playful",
];

/**
 * Content templates a user can generate from scratch.
 */
export const TEMPLATES = [
  {
    id: "blog-intro",
    label: "Blog intro",
    prompt:
      "Write an engaging 2-paragraph blog introduction about: ",
  },
  {
    id: "product-desc",
    label: "Product description",
    prompt:
      "Write a punchy product description (about 80 words) for: ",
  },
  {
    id: "ad-copy",
    label: "Ad copy",
    prompt:
      "Write 3 short, high-converting ad headlines and one supporting line for: ",
  },
  {
    id: "email",
    label: "Cold email",
    prompt:
      "Write a concise, friendly cold outreach email about: ",
  },
  {
    id: "social",
    label: "Social post",
    prompt:
      "Write a compelling LinkedIn post (with a strong hook) about: ",
  },
];

/* ----------------------------------------------------------- board prompts */

export function buildIdeasMessage(topic) {
  return `Brainstorm 6 concise, distinct ideas for: ${topic}.
Return each idea on its own line, max 8 words each. No numbering, no bullets, no preamble.`;
}

export function buildExpandNoteMessage(note) {
  return `Given this idea: "${note}", suggest 3 concrete, related sub-ideas that build on it.
Return each on its own line, max 8 words each. No numbering, no bullets, no preamble.`;
}

export function buildBoardSummaryMessage(notes) {
  const list = notes.map((n) => `- ${n}`).join("\n");
  return `The following are sticky notes from a brainstorming board:\n${list}\n\nSynthesize them into a short Markdown brief: a one-line summary, then group the ideas under 2–3 themed headings.`;
}

/** Parse a newline / bullet list from a model response into clean lines. */
export function parseLines(text, max = 8) {
  return (text || "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0 && l.length < 120)
    .slice(0, max);
}

/**
 * Build the user-turn content for a given action.
 * @param {string} action
 * @param {string} text  Document text or selection.
 * @param {object} [opts]
 * @param {string} [opts.tone]   Tone for the "tone" action.
 * @param {string} [opts.prompt] Freeform prompt for "generate".
 */
export function buildUserMessage(action, text, opts = {}) {
  switch (action) {
    case "improve":
      return `Improve the following text for clarity, flow, and impact. Keep the meaning and roughly the same length.\n\n---\n${text}`;
    case "summarize":
      return `Summarize the key points of the following text as a short bulleted list.\n\n---\n${text}`;
    case "expand":
      return `Expand the following text with more detail, examples, and supporting reasoning. Keep the same voice.\n\n---\n${text}`;
    case "grammar":
      return `Correct all grammar, spelling, and punctuation in the following text. Return only the corrected text with no explanation.\n\n---\n${text}`;
    case "continue":
      return `Continue writing naturally from where this text leaves off. Return only the new continuation.\n\n---\n${text}`;
    case "tone":
      return `Rewrite the following text in a ${opts.tone || "professional"} tone.\n\n---\n${text}`;
    case "generate":
      return opts.prompt || "Write something interesting.";
    default:
      return text;
  }
}
