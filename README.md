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
- **Markdown editor** with a live preview toggle and word/character counts.
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
- **Simulated real-time collaboration** — teammate avatars with live presence
  (editing / viewing / commenting), animated **live cursors** on the board, and
  an activity feed.
- **Comments** — threaded comments per document with resolve/reopen.
- **Real Claude integration + demo fallback** — add an API key for real,
  context-aware generation, or explore with built-in demo responses.

## Getting started

```bash
npm install
npm run dev
```

Then open the app (Vite prints the URL, usually http://localhost:5173).

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
src/
  App.jsx                  # state, persistence, editor text operations
  lib/
    ai.js                  # Claude streaming client
    demo.js                # canned/mock streaming responses
    prompts.js             # system prompt, actions, templates, message builders
    markdown.js            # tiny Markdown → HTML renderer
    storage.js             # localStorage persistence
    seed.js                # first-run seed data + simulated presence
  components/
    Sidebar.jsx            # documents + boards lists
    Editor.jsx             # title + Markdown editor with preview
    Board.jsx              # whiteboard canvas (pan/zoom, notes, live cursors)
    RightRail.jsx          # tabbed rail, mode-aware (doc vs board)
    AssistantPanel.jsx     # the document AI assistant UI
    BoardAssistant.jsx     # the board AI tools (ideas / expand / summarize)
    CommentsPanel.jsx      # threaded comments
    ActivityFeed.jsx       # workspace activity
    PresenceBar.jsx        # simulated collaborator presence
    SettingsModal.jsx      # API key + demo toggle
```

## Tech stack

React 18 · Vite 5 · the Anthropic Messages API (streaming). No UI framework —
hand-written CSS with light/dark support.

## Possible extensions

- Real-time multiplayer via a CRDT (Yjs) + WebSocket backend.
- Server-side API proxy so keys never touch the client.
- Rich-text editing (TipTap/ProseMirror) instead of Markdown source.
- Export to PDF/DOCX via Claude's code-execution or a server renderer.
