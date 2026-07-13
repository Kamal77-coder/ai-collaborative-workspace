# Synapse — AI Collaborative Workspace

A collaborative workspace with an AI assistant built in — documents **and** a
visual whiteboard. Think Notion + FigJam with an AI copywriter. Built with
**React + Vite**, powered by a real **Claude** integration, with a zero-setup
**demo mode** so it runs instantly.

> A portfolio project demonstrating a full AI-content product: streaming LLM
> integration, a document editor, and an interactive canvas (pan/zoom, drag,
> live cursors).

![demo mode / live mode](https://img.shields.io/badge/AI-Claude%20%C2%B7%20streaming-7c6cff) ![react](https://img.shields.io/badge/React-18-61dafb) ![vite](https://img.shields.io/badge/Vite-5-646cff)

## Features

- **Multi-document workspace** — create, rename, and delete documents; everything
  autosaves to your browser.
- **Rich-text editor** (TipTap / ProseMirror) — WYSIWYG formatting (bold, italic,
  headings, lists, quotes, inline code, links) with a toolbar, plus **undo/redo**.
- **Version history** — snapshot a document at any point and restore it later;
  a snapshot is also taken automatically before the AI rewrites the whole doc.
- **AI writing assistant** (the core feature):
  - Quick actions on your document or selection: **Improve**, **Summarize**,
    **Expand**, **Fix grammar**, **Continue writing**.
  - **Tone rewriting** (professional, casual, persuasive, friendly, confident,
    playful).
  - **Templates** — one-click drafts for blog intros, product descriptions, ad
    copy, cold emails, and social posts.
  - **Ask anything** freeform prompt.
  - Output **streams in live**, then **Insert**, **Replace**, or **Copy** it into
    the editor.
- **AI whiteboard** — a pannable, zoomable canvas of draggable, editable, colored
  sticky notes. AI actions: **generate ideas** into notes, **expand** a selected
  note into related notes, and **summarize the whole board into a document**.
- **Real-time collaboration over WebSockets** — a small Node `ws` server relays
  **presence** (avatars for everyone viewing the same doc/board) and **live
  cursors** across browser windows. Open a second window to see it; each tab is a
  distinct user. Falls back to single-player if the server isn't running.
- **Comments** — threaded comments per document with resolve/reopen, plus a
  workspace activity feed.
- **Real Claude integration + demo fallback** — add an API key for real,
  context-aware generation, or explore with built-in demo responses.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts **both** the Vite web app (http://localhost:5173) and the
realtime WebSocket server (ws://localhost:8787) together. To run them separately:
`npm run web` and `npm run server`.

> The app works fully without the server — presence and live cursors simply stay
> offline (indicated by the dot next to the avatars). Open **two browser windows**
> to see real-time presence and cursors.

The app starts in **demo mode** with canned responses. To use real AI:

1. Click **⚙︎ Settings** in the top bar.
2. Paste a Claude API key (get one at
   [console.anthropic.com](https://console.anthropic.com/)) and uncheck *Demo mode*.

Or set the key at build time — copy `.env.example` to `.env.local` and fill in
`VITE_ANTHROPIC_API_KEY`.

## How the AI works

- Calls the Anthropic **Messages API** directly from the browser using the
  `anthropic-dangerous-direct-browser-access` header, with **streaming** (SSE)
  and **adaptive thinking**. Model: `claude-opus-4-8`.
- See [`src/lib/ai.js`](src/lib/ai.js) for the streaming client and
  [`src/lib/prompts.js`](src/lib/prompts.js) for the system prompt and per-action
  instructions.

> **Security note:** calling the API from the browser exposes the key to that
> browser session, which is fine for a local/demo tool where *you* supply *your
> own* key. In a production deployment the key would live server-side behind a
> small proxy, and the browser would call your backend instead. The streaming and
> prompt logic would move to the server largely unchanged.

## Project structure

```
server/
  index.js                 # WebSocket relay: presence + live cursors (rooms)
src/
  App.jsx                  # state, persistence, realtime, editor/version ops
  lib/
    ai.js                  # Claude streaming client
    realtime.js            # WebSocket client (identity, rooms, cursors, reconnect)
    demo.js                # canned/mock AI responses
    prompts.js             # system prompt, actions, templates, message builders
    markdown.js            # tiny Markdown → HTML renderer (AI output → editor)
    storage.js             # localStorage persistence
    seed.js                # first-run seed data
  components/
    Sidebar.jsx            # documents + boards lists
    Editor.jsx             # TipTap rich-text editor + formatting toolbar
    Board.jsx              # whiteboard canvas (pen/shapes, notes, pan/zoom)
    RightRail.jsx          # tabbed rail, mode-aware (doc vs board)
    AssistantPanel.jsx     # the document AI assistant UI
    BoardAssistant.jsx     # the board AI tools (ideas / expand / summarize)
    CommentsPanel.jsx      # threaded comments
    VersionHistory.jsx     # document snapshots + restore
    ActivityFeed.jsx       # workspace activity
    PresenceBar.jsx        # real presence avatars + connection status
    LiveCursors.jsx        # remote cursor overlay
    SettingsModal.jsx      # API key, demo toggle, presence toggle
```

## Tech stack

React 18 · Vite 5 · **TipTap / ProseMirror** (rich text) · **`ws`** (WebSocket
realtime server) · the Anthropic Messages API (streaming). No UI framework —
hand-written CSS with light/dark support.

## Possible extensions

- **Conflict-free multiplayer editing** — the current WebSocket layer syncs
  presence and cursors; adding a CRDT (Yjs) would sync document *content* too,
  with per-caret cursors inside the text.
- Server-side API proxy so the Claude key never touches the client.
- Persistence beyond `localStorage` (a real backend + auth).
- Export to PDF/DOCX via Claude's code-execution or a server renderer.
