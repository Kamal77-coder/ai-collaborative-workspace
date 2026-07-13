import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadWorkspace,
  saveWorkspace,
  loadSettings,
  saveSettings,
} from "./lib/storage.js";
import { seedWorkspace, uid, rollPresence, NOTE_COLORS } from "./lib/seed.js";
import Sidebar from "./components/Sidebar.jsx";
import Editor from "./components/Editor.jsx";
import Board from "./components/Board.jsx";
import RightRail from "./components/RightRail.jsx";
import PresenceBar from "./components/PresenceBar.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export default function App() {
  const [state, setState] = useState(() => loadWorkspace() || seedWorkspace());
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    return { apiKey: s.apiKey ?? envKey, demoMode: s.demoMode ?? !envKey };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presence, setPresence] = useState(() => rollPresence());
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => saveWorkspace(state), [state]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    const t = setInterval(() => setPresence(rollPresence()), 6000);
    return () => clearInterval(t);
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
    setSelection({ start: 0, end: 0 });
    setState((s) => ({ ...s, activeView: "docs", activeDocId: id }));
  }, []);

  const createDoc = useCallback(() => {
    const doc = {
      id: uid("doc"),
      title: "Untitled document",
      content: "",
      comments: [],
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

  // Create a document from AI-generated text (used by the board summary action).
  const createDocFromText = useCallback(
    (title, content) => {
      const doc = {
        id: uid("doc"),
        title,
        content,
        comments: [],
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

  const insertText = useCallback(
    (text) => {
      if (!activeDoc) return;
      const { end } = selection;
      const c = activeDoc.content;
      const at = Math.min(end, c.length);
      const next = c.slice(0, at) + text + c.slice(at);
      setContent(next);
      const pos = at + text.length;
      setSelection({ start: pos, end: pos });
    },
    [activeDoc, selection, setContent]
  );

  const replaceText = useCallback(
    (text) => {
      if (!activeDoc) return;
      const { start, end } = selection;
      const c = activeDoc.content;
      if (start !== end) {
        setContent(c.slice(0, start) + text + c.slice(end));
        setSelection({ start, end: start + text.length });
      } else {
        setContent(text);
        setSelection({ start: text.length, end: text.length });
      }
    },
    [activeDoc, selection, setContent]
  );

  const selectedText = activeDoc
    ? activeDoc.content.slice(selection.start, selection.end)
    : "";

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

        <PresenceBar presence={presence} />

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

      <div className="workspace">
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
              presence={presence}
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
            selection={selection}
            onSelectionChange={setSelection}
            onContentChange={setContent}
            onTitleChange={(title) => patchActiveDoc({ title })}
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
          docContent={activeDoc?.content || ""}
          selectedText={selectedText}
          onInsert={insertText}
          onReplace={replaceText}
          comments={activeDoc?.comments || []}
          onAddComment={addComment}
          onToggleComment={toggleComment}
          onDeleteComment={deleteComment}
          /* board mode */
          board={activeBoard}
          selectedNote={selectedNote}
          onAddNotes={addNotes}
          onCreateDocFromText={createDocFromText}
          /* shared */
          activity={state.activity}
          onOpenSettings={() => setSettingsOpen(true)}
        />
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
