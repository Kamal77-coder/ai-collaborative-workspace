/**
 * Seed data for a first-time visitor: starter documents and boards, a roster of
 * simulated collaborators, and helpers for the (simulated) presence system.
 */

let idCounter = 0;
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

export const COLLABORATORS = [
  { id: "u_maya", name: "Maya Chen", initials: "MC", color: "#6366f1" },
  { id: "u_devon", name: "Devon Park", initials: "DP", color: "#ec4899" },
  { id: "u_aria", name: "Aria Silva", initials: "AS", color: "#10b981" },
  { id: "u_you", name: "You", initials: "YO", color: "#f59e0b" },
];

/** Sticky-note colors used on boards. */
export const NOTE_COLORS = [
  "#fde68a", // amber
  "#a7f3d0", // green
  "#bfdbfe", // blue
  "#fbcfe8", // pink
  "#ddd6fe", // violet
  "#fed7aa", // orange
];

const STATUSES = ["editing", "viewing", "idle", "commenting"];

/** Randomly re-roll the presence status of the (fake) teammates. */
export function rollPresence() {
  return COLLABORATORS.filter((c) => c.id !== "u_you").map((c) => ({
    ...c,
    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
  }));
}

export function seedWorkspace() {
  const now = Date.now();
  return {
    activeView: "docs", // "docs" | "boards"
    activeDocId: "doc_welcome",
    activeBoardId: "board_ideas",
    documents: [
      {
        id: "doc_welcome",
        title: "Welcome to Synapse",
        content: `# Welcome to Synapse ✨

Synapse is a collaborative workspace with an AI assistant built in.

## Documents
1. Select some text (or none) and click an assistant action like **Improve** or **Summarize**.
2. Generate fresh copy from a **template** — blog intros, product descriptions, ad copy, and more.
3. Leave **comments** in the right rail and watch teammate presence up top.

## Boards
Switch to a **Board** in the sidebar for a visual whiteboard: drag sticky notes,
pan and zoom the canvas, and let AI **generate ideas**, **expand a note**, or
**summarize the whole board into a document**.

The assistant runs on Claude when you add an API key in **Settings** — otherwise it uses a built-in demo mode so you can explore instantly.

> Tip: everything is saved to your browser automatically.`,
        comments: [
          {
            id: "c1",
            author: "Maya Chen",
            text: "Love the opening line — maybe lead with the AI angle?",
            resolved: false,
            createdAt: now - 1000 * 60 * 42,
          },
        ],
        createdAt: now - 1000 * 60 * 60 * 24,
        updatedAt: now - 1000 * 60 * 42,
      },
      {
        id: "doc_launch",
        title: "Product launch announcement",
        content: `# Introducing Flowlytics 2.0

Draft the launch announcement here. Highlight the three headline features, keep it under 200 words, and end with a clear call to action.

Delete this and start writing — or hit **Generate** in the assistant to get a first draft.`,
        comments: [],
        createdAt: now - 1000 * 60 * 60 * 5,
        updatedAt: now - 1000 * 60 * 60 * 5,
      },
    ],
    boards: [
      {
        id: "board_ideas",
        title: "Campaign brainstorm",
        nodes: [
          { id: "n1", x: 80, y: 80, text: "Launch week countdown", color: NOTE_COLORS[0] },
          { id: "n2", x: 320, y: 120, text: "Founder story video", color: NOTE_COLORS[2] },
          { id: "n3", x: 180, y: 300, text: "Customer case studies", color: NOTE_COLORS[1] },
          { id: "n4", x: 460, y: 320, text: "Referral incentive", color: NOTE_COLORS[3] },
        ],
        createdAt: now - 1000 * 60 * 60 * 3,
        updatedAt: now - 1000 * 60 * 30,
      },
    ],
    activity: [
      { id: uid("a"), text: "Maya Chen commented on “Welcome to Synapse”", at: now - 1000 * 60 * 42 },
      { id: uid("a"), text: "Devon Park added a note to “Campaign brainstorm”", at: now - 1000 * 60 * 55 },
      { id: uid("a"), text: "Aria Silva created “Product launch announcement”", at: now - 1000 * 60 * 60 * 5 },
    ],
  };
}
