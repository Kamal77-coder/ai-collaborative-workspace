import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadWorkspace,
  saveWorkspace,
  loadSettings,
  saveSettings,
} from "./lib/storage.js";
import { seedWorkspace, uid, NOTE_COLORS } from "./lib/seed.js";
import { Realtime, makeIdentity } from "./lib/realtime.js";
import { renderMarkdown } from "./lib/markdown.js";
import Sidebar from "./components/Sidebar.jsx";
import Editor from "./components/Editor.jsx";
import Board from "./components/Board.jsx";
import RightRail from "./components/RightRail.jsx";
import PresenceBar from "./components/PresenceBar.jsx";
import LiveCursors from "./components/LiveCursors.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export default function App() {
  const [state, setState] = useState(() => loadWorkspace() || seedWorkspace());
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    return {
      apiKey: s.apiKey ?? envKey,
      demoMode: s.demoMode ?? !envKey,
      // Real presence + live cursors. On by default — with the WebSocket
      // transport these only appear when another person is actually connected,
      // so there's nothing distracting when you're alone.
      showCollaborators: s.showCollaborators ?? true,
    };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  // Rich-text editor (TipTap) — the live instance plus derived text used by the
  // AI assistant and word count.
  const editorRef = useRef(null);
  const [docText, setDocText] = useState("");
  const [selectedText, setSelectedText] = useState("");

  // Realtime collaboration (presence + live cursors) over WebSocket.
  const identity = useRef(null);
  if (!identity.current) identity.current = makeIdentity();
  const rtRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [rtConnected, setRtConnected] = useState(false);
  const workspaceRef = useRef(null);

  useEffect(() => saveWorkspace(state), [state]);
  useEffect(() => saveSettings(settings), [settings]);

  // Connect once; wire presence + cursor events.
  useEffect(() => {
    const rt = new Realtime(identity.current);
    rtRef.current = rt;
    const offs = [
      rt.on("presence", (list) => setUsers(list)),
      rt.on("status", ({ connected }) => setRtConnected(connected)),
      rt.on("cursor", (m) =>
        setRemoteCursors((c) => ({ ...c, [m.id]: { user: m.user, x: m.x, y: m.y } }))
      ),
      rt.on("cursor-leave", (m) =>
        setRemoteCursors((c) => {
          const n = { ...c };
          delete n[m.id];
          return n;
        })
      ),
    ];
    return () => {
      offs.forEach((off) => off());
      rt.destroy();
    };
  }, []);

  const onBoard = state.activeView === "boards";
  const activeDoc = useMemo(
    () => state.documents.find((d) => d.id === state.activeDocId) || null,
    [state]
  );
  const activeBoard = useMemo(
    () => state.boards.find((b) => b.id === state.activeBoardId) || null,
    [state]
  );

  const usingRealAI = !settings.demoMode && !!settings.apiKey;

  // Join a realtime room per open document / board so presence and cursors are
  // scoped to whoever is viewing the same item.
  const room = onBoard ? `board:${state.activeBoardId}` : `doc:${state.activeDocId}`;
  useEffect(() => {
    rtRef.current?.join(room);
    setRemoteCursors({});
  }, [room]);

  const onWorkspaceMouseMove = (e) => {
    if (!settings.showCollaborators || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    rtRef.current?.cursor(e.clientX - rect.left, e.clientY - rect.top);
  };

  /* ---------------------------------------------------------------- helpers */

  const addActivity = useCallback((text) => {
    setState((s) => ({
      ...s,
      activity: [{ id: uid("a"), text, at: Date.now() }, ...s.activity].slice(0, 30),
    }));
  }, []);

  /* ------------------------------------------------------------- documents */

  const patchActiveDoc = useCallback((patch) => {
    setState((s) => ({
      ...s,
      documents: s.documents.map((d) =>
        d.id === s.activeDocId ? { ...d, ...patch, updatedAt: Date.now() } : d
      ),
    }));
  }, []);

  const setContent = useCallback(
    (content) => patchActiveDoc({ content }),
    [patchActiveDoc]
  );

  const selectDoc = useCallback((id) => {
    setSelectedText("");
    setState((s) => ({ ...s, activeView: "docs", activeDocId: id }));
  }, []);

  const createDoc = useCallback(() => {
    const doc = {
      id: uid("doc"),
      title: "Untitled document",
      content: "",
      comments: [],
      versions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      documents: [doc, ...s.documents],
      activeView: "docs",
      activeDocId: doc.id,
    }));
    addActivity("You created “Untitled document”");
  }, [addActivity]);

  const deleteDoc = useCallback((id) => {
    setState((s) => {
      const remaining = s.documents.filter((d) => d.id !== id);
      return {
        ...s,
        documents: remaining,
        activeDocId: s.activeDocId === id ? remaining[0]?.id ?? null : s.activeDocId,
      };
    });
  }, []);

  // Create a document from AI-generated Markdown (used by the board summary).
  const createDocFromText = useCallback(
    (title, markdown) => {
      const doc = {
        id: uid("doc"),
        title,
        content: renderMarkdown(markdown), // stored as HTML for the rich editor
        comments: [],
        versions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setState((s) => ({
        ...s,
        documents: [doc, ...s.documents],
        activeView: "docs",
        activeDocId: doc.id,
      }));
      addActivity(`You created “${title}” from a board`);
    },
    [addActivity]
  );

  /* ----------------------------------------------- editor text operations */

  // Editor lifecycle: keep content (HTML), plain text, and selection in sync.
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleEditorUpdate = useCallback(
    ({ html, text }) => {
      setContent(html);
      setDocText(text);
    },
    [setContent]
  );

  // Snapshot the current document into its version history.
  const saveVersion = useCallback(
    (label) => {
      if (!activeDoc) return;
      patchActiveDoc({
        versions: [
          { id: uid("v"), at: Date.now(), label, content: activeDoc.content },
          ...(activeDoc.versions || []),
        ].slice(0, 50),
      });
    },
    [activeDoc, patchActiveDoc]
  );

  const restoreVersion = useCallback(
    (vid) => {
      const v = (activeDoc?.versions || []).find((x) => x.id === vid);
      if (!v || !editorRef.current) return;
      saveVersion("before restore");
      editorRef.current.commands.setContent(v.content);
      setContent(v.content);
    },
    [activeDoc, saveVersion, setContent]
  );

  // AI insert/replace route through the live editor (content is Markdown → HTML).
  const insertText = useCallback((markdown) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertContent(renderMarkdown(markdown)).run();
  }, []);

  const replaceText = useCallback(
    (markdown) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const html = renderMarkdown(markdown);
      if (from !== to) {
        editor.chain().focus().insertContent(html).run(); // replaces selection
      } else {
        saveVersion("before AI rewrite");
        editor.chain().focus().setContent(html).run();
      }
    },
    [saveVersion]
  );

  /* ---------------------------------------------------------------- boards */

  const patchActiveBoard = useCallback((updater) => {
    setState((s) => ({
      ...s,
      boards: s.boards.map((b) =>
        b.id === s.activeBoardId
          ? { ...updater(b), updatedAt: Date.now() }
          : b
      ),
    }));
  }, []);

  const selectBoard = useCallback((id) => {
    setSelectedNoteId(null);
    setState((s) => ({ ...s, activeView: "boards", activeBoardId: id }));
  }, []);

  const createBoard = useCallback(() => {
    const board = {
      id: uid("board"),
      title: "Untitled board",
      nodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      boards: [board, ...s.boards],
      activeView: "boards",
      activeBoardId: board.id,
    }));
    addActivity("You created “Untitled board”");
  }, [addActivity]);

  const deleteBoard = useCallback((id) => {
    setState((s) => {
      const remaining = s.boards.filter((b) => b.id !== id);
      return {
        ...s,
        boards: remaining,
        activeBoardId:
          s.activeBoardId === id ? remaining[0]?.id ?? null : s.activeBoardId,
      };
    });
  }, []);

  const renameBoard = useCallback(
    (title) => patchActiveBoard((b) => ({ ...b, title })),
    [patchActiveBoard]
  );

  const addNote = useCallback(
    (partial = {}) => {
      const note = {
        id: uid("n"),
        x: partial.x ?? 120 + Math.random() * 120,
        y: partial.y ?? 120 + Math.random() * 120,
        text: partial.text ?? "",
        color:
          partial.color ??
          NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      };
      patchActiveBoard((b) => ({ ...b, nodes: [...b.nodes, note] }));
      return note.id;
    },
    [patchActiveBoard]
  );

  // Drop a batch of AI-generated ideas as notes in a tidy grid.
  const addNotes = useCallback(
    (texts) => {
      patchActiveBoard((b) => {
        const startY = b.nodes.length ? 0 : 0;
        const created = texts.map((text, i) => ({
          id: uid("n"),
          x: 80 + (i % 3) * 240,
          y: 80 + Math.floor(i / 3) * 170 + startY,
          text,
          color: NOTE_COLORS[i % NOTE_COLORS.length],
        }));
        return { ...b, nodes: [...b.nodes, ...created] };
      });
      addActivity(`AI added ${texts.length} notes to a board`);
    },
    [patchActiveBoard, addActivity]
  );

  const updateNote = useCallback(
    (id, patch) =>
      patchActiveBoard((b) => ({
        ...b,
        nodes: b.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      })),
    [patchActiveBoard]
  );

  const deleteNote = useCallback(
    (id) => {
      patchActiveBoard((b) => ({
        ...b,
        nodes: b.nodes.filter((n) => n.id !== id),
      }));
      setSelectedNoteId((cur) => (cur === id ? null : cur));
    },
    [patchActiveBoard]
  );

  const selectedNote =
    activeBoard?.nodes.find((n) => n.id === selectedNoteId) || null;

  /* ----------------------------------------------------- board drawings */

  const addDrawing = useCallback(
    (drawing) =>
      patchActiveBoard((b) => ({
        ...b,
        drawings: [...(b.drawings || []), { id: uid("d"), ...drawing }],
      })),
    [patchActiveBoard]
  );

  const deleteDrawing = useCallback(
    (id) =>
      patchActiveBoard((b) => ({
        ...b,
        drawings: (b.drawings || []).filter((d) => d.id !== id),
      })),
    [patchActiveBoard]
  );

  const clearDrawings = useCallback(
    () => patchActiveBoard((b) => ({ ...b, drawings: [] })),
    [patchActiveBoard]
  );

  /* ---------------------------------------------------------------- comments */

  const addComment = useCallback(
    (text) => {
      patchActiveDoc({
        comments: [
          ...(activeDoc?.comments || []),
          { id: uid("c"), author: "You", text, resolved: false, createdAt: Date.now() },
        ],
      });
    },
    [activeDoc, patchActiveDoc]
  );

  const toggleComment = useCallback(
    (cid) =>
      patchActiveDoc({
        comments: (activeDoc?.comments || []).map((c) =>
          c.id === cid ? { ...c, resolved: !c.resolved } : c
        ),
      }),
    [activeDoc, patchActiveDoc]
  );

  const deleteComment = useCallback(
    (cid) =>
      patchActiveDoc({
        comments: (activeDoc?.comments || []).filter((c) => c.id !== cid),
      }),
    [activeDoc, patchActiveDoc]
  );

  /* ------------------------------------------------------------------ render */

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✍️</span>
          <div>
            <div className="brand-name">Synapse</div>
            <div className="brand-sub">AI Collaborative Workspace</div>
          </div>
        </div>

        <PresenceBar
          users={users}
          you={identity.current}
          connected={rtConnected}
          show={settings.showCollaborators}
        />

        <div className="topbar-right">
          <span className={`ai-badge ${usingRealAI ? "live" : "demo"}`}>
            <span className="dot" />
            {usingRealAI ? "Claude · live" : "Demo mode"}
          </span>
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            ⚙︎ Settings
          </button>
        </div>
      </header>

      <div className="workspace" ref={workspaceRef} onMouseMove={onWorkspaceMouseMove}>
        <Sidebar
          documents={state.documents}
          boards={state.boards}
          activeView={state.activeView}
          activeDocId={state.activeDocId}
          activeBoardId={state.activeBoardId}
          onSelectDoc={selectDoc}
          onSelectBoard={selectBoard}
          onCreateDoc={createDoc}
          onCreateBoard={createBoard}
          onDeleteDoc={deleteDoc}
          onDeleteBoard={deleteBoard}
        />

        {onBoard ? (
          activeBoard ? (
            <Board
              key={activeBoard.id}
              board={activeBoard}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onRename={renameBoard}
              onAddDrawing={addDrawing}
              onDeleteDrawing={deleteDrawing}
              onClearDrawings={clearDrawings}
            />
          ) : (
            <main className="editor empty-state">
              <p>No board selected.</p>
              <button className="btn primary" onClick={createBoard}>
                + New board
              </button>
            </main>
          )
        ) : activeDoc ? (
          <Editor
            key={activeDoc.id}
            doc={activeDoc}
            onReady={handleEditorReady}
            onUpdate={handleEditorUpdate}
            onSelectionChange={setSelectedText}
            onTitleChange={(title) => patchActiveDoc({ title })}
            onSaveVersion={() => saveVersion("manual save")}
          />
        ) : (
          <main className="editor empty-state">
            <p>No document selected.</p>
            <button className="btn primary" onClick={createDoc}>
              + New document
            </button>
          </main>
        )}

        <RightRail
          mode={onBoard ? "board" : "doc"}
          settings={settings}
          /* doc mode */
          docContent={docText}
          selectedText={selectedText}
          onInsert={insertText}
          onReplace={replaceText}
          comments={activeDoc?.comments || []}
          onAddComment={addComment}
          onToggleComment={toggleComment}
          onDeleteComment={deleteComment}
          versions={activeDoc?.versions || []}
          onSaveVersion={() => saveVersion("manual save")}
          onRestoreVersion={restoreVersion}
          /* board mode */
          board={activeBoard}
          selectedNote={selectedNote}
          onAddNotes={addNotes}
          onCreateDocFromText={createDocFromText}
          /* shared */
          activity={state.activity}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {settings.showCollaborators && <LiveCursors cursors={remoteCursors} />}
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(next) => {
            setSettings(next);
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
