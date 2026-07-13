/**
 * Seed data for a first-time visitor: starter documents and boards, a roster of
 * simulated collaborators, and helpers for the (simulated) presence system.
 */

let idCounter = 0;
export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

/** Sticky-note colors used on boards. */
export const NOTE_COLORS = [
  "#fde68a", // amber
  "#a7f3d0", // green
  "#bfdbfe", // blue
  "#fbcfe8", // pink
  "#ddd6fe", // violet
  "#fed7aa", // orange
];

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
        content: `<h1>Welcome to Synapse ✨</h1><p>Synapse is a collaborative workspace with an AI assistant built in.</p><h2>Documents</h2><ol><li>Select some text (or none) and click an assistant action like <strong>Improve</strong> or <strong>Summarize</strong>.</li><li>Generate fresh copy from a <strong>template</strong> — blog intros, product descriptions, ad copy, and more.</li><li>Leave <strong>comments</strong> in the right rail, snapshot the doc under <strong>History</strong>, and watch live presence up top.</li></ol><h2>Boards</h2><p>Switch to a <strong>Board</strong> in the sidebar for a visual whiteboard: draw with the pen, drag sticky notes, and let AI <strong>generate ideas</strong> or <strong>summarize the board into a document</strong>.</p><p>The assistant runs on Claude when you add an API key in <strong>Settings</strong> — otherwise it uses a built-in demo mode so you can explore instantly.</p><blockquote>Tip: open a second browser window to see real-time presence and cursors.</blockquote>`,
        versions: [],
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
        content: `<h1>Introducing Flowlytics 2.0</h1><p>Draft the launch announcement here. Highlight the three headline features, keep it under 200 words, and end with a clear call to action.</p><p>Delete this and start writing — or hit <strong>Generate</strong> in the assistant to get a first draft.</p>`,
        versions: [],
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
