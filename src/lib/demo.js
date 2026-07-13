/**
 * Demo / mock AI responses.
 *
 * Used when no Claude API key is configured, so the app is fully explorable with
 * zero setup. Responses are canned but tailored per action, and streamed word by
 * word to mimic the real streaming UX.
 */

/** @param {number} ms */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function pickResponse(action, input) {
  const snippet = (input || "").trim().slice(0, 60);
  switch (action) {
    case "improve":
      return `Here's a tighter, more vivid version:\n\nThe idea lands harder when every sentence earns its place. I trimmed the throat-clearing, swapped passive constructions for active ones, and led with the most concrete claim so a reader knows within the first line why this matters.`;
    case "summarize":
      return `**Summary**\n\n- The core argument is stated up front and supported with specifics.\n- Secondary points reinforce rather than repeat the main claim.\n- The takeaway: focus on one idea and make it impossible to misread.`;
    case "expand":
      return `${input}\n\nTo build on that: the strongest writing anticipates the reader's next question and answers it before it's asked. Concrete examples do more work than adjectives — a single specific detail is more persuasive than three vague ones. Consider adding a short scenario your reader will recognize from their own experience.`;
    case "grammar":
      return `Here's the text with grammar, punctuation, and spacing corrected — meaning unchanged:\n\n${input || "(no text selected)"}`;
    case "continue":
      return `${input} …and that is exactly where the opportunity lies. Once you frame the problem in the reader's own terms, the solution feels inevitable rather than imposed. The next paragraph should show, not tell — one crisp example beats a paragraph of assurances.`;
    case "tone":
      return `Rewritten in the requested tone:\n\nWe're genuinely excited to share this with you. It's the kind of thing we'd want a friend to know about — clear, useful, and refreshingly free of jargon. Give it a try and tell us what you think.`;
    case "generate":
      return `${
        snippet ? `On "${snippet}…":\n\n` : ""
      }Great products don't announce themselves — they earn attention by solving a real problem faster than anything else. Start with the outcome your reader wants, name the friction standing in the way, then show, in one concrete beat, how it disappears. Keep the first sentence short. Earn the second.`;
    default:
      return `This is a demo response. Add your Claude API key in Settings to generate real, context-aware content.`;
  }
}

/* ------------------------------------------------------------ board demos */

const DEMO_IDEAS = [
  "Behind-the-scenes launch teaser",
  "Limited-time early-bird offer",
  "Interactive product demo day",
  "Partner co-marketing push",
  "User-generated content contest",
  "Countdown email sequence",
  "Live Q&A with the founders",
  "Templates & starter kit giveaway",
];

/** Non-streaming demo helpers for the whiteboard. */
export function demoIdeas(topic) {
  const shuffled = [...DEMO_IDEAS].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 6);
  return topic ? picks.map((p) => p) : picks;
}

export function demoExpand(note) {
  return [
    `${note}: define the audience`,
    `${note}: pick one channel`,
    `${note}: measure with a KPI`,
  ];
}

export function demoBoardSummary(notes) {
  return `**Summary:** The board centers on driving launch momentum through timely, community-led moments.\n\n## Awareness\n- ${notes[0] || "Teaser content"}\n- ${notes[1] || "Founder story"}\n\n## Conversion\n- ${notes[2] || "Case studies"}\n- ${notes[3] || "Referral incentive"}`;
}

/**
 * Async generator that streams a demo response word by word.
 * Matches the shape of `streamClaude` so callers can swap them freely.
 *
 * @param {{action: string, input: string, signal?: AbortSignal}} opts
 * @returns {AsyncGenerator<string>}
 */
export async function* streamDemo({ action, input, signal }) {
  const text = pickResponse(action, input);
  const tokens = text.match(/\S+\s*/g) || [text];
  await wait(250);
  for (const token of tokens) {
    if (signal?.aborted) return;
    yield token;
    await wait(18 + Math.random() * 40);
  }
}
