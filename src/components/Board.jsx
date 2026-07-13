import { useEffect, useRef, useState } from "react";
import { NOTE_COLORS } from "../lib/seed.js";

const NOTE_W = 190;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.2;

const PEN_COLORS = ["#7c6cff", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#e6e8ee"];

const TOOLS = [
  { id: "select", icon: "⤢", label: "Select / pan" },
  { id: "pen", icon: "✎", label: "Pen" },
  { id: "rect", icon: "▭", label: "Rectangle" },
  { id: "arrow", icon: "↗", label: "Arrow" },
  { id: "eraser", icon: "⌫", label: "Eraser" },
];

/**
 * Infinite-ish whiteboard. Sticky notes AND freehand drawings live in "world"
 * coordinates; the canvas layer is translated + scaled by `view`. A tool mode
 * governs whether pointer input pans the canvas, draws, or erases.
 */
export default function Board({
  board,
  presence,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onRename,
  onAddDrawing,
  onDeleteDrawing,
  onClearDrawings,
}) {
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState("select");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [draft, setDraft] = useState(null); // in-progress drawing (local only)

  const surfaceRef = useRef(null);
  const drag = useRef(null);

  // Refs mirror state so the window listeners always read fresh values.
  const viewRef = useRef(view);
  const toolRef = useRef(tool);
  const draftRef = useRef(draft);
  const drawingsRef = useRef(board.drawings || []);
  useEffect(() => void (viewRef.current = view), [view]);
  useEffect(() => void (toolRef.current = tool), [tool]);
  useEffect(() => void (draftRef.current = draft), [draft]);
  useEffect(() => void (drawingsRef.current = board.drawings || []), [board.drawings]);

  const drawingMode = tool !== "select";

  const toWorld = (clientX, clientY) => {
    const rect = surfaceRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.scale,
      y: (clientY - rect.top - v.y) / v.scale,
    };
  };

  const eraseAt = (w) => {
    const r = 14 / viewRef.current.scale;
    for (const d of drawingsRef.current) {
      if (hitTest(d, w, r)) onDeleteDrawing(d.id);
    }
  };

  /* ------------------------------------------------------- interactions */
  const onSurfaceMouseDown = (e) => {
    if (e.button !== 0) return;

    if (tool === "select") {
      if (e.target !== surfaceRef.current) return; // notes handle themselves
      onSelectNote(null);
      drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, origin: { ...view } };
      return;
    }

    // Drawing tools: notes are non-interactive (pointer-events:none) so the
    // event always lands on the surface.
    const w = toWorld(e.clientX, e.clientY);
    if (tool === "eraser") {
      drag.current = { mode: "erase" };
      eraseAt(w);
      return;
    }
    if (tool === "pen") {
      setDraft({ kind: "path", color: penColor, width: 3, points: [w] });
    } else if (tool === "rect") {
      setDraft({ kind: "rect", color: penColor, x: w.x, y: w.y, w: 0, h: 0, _sx: w.x, _sy: w.y });
    } else if (tool === "arrow") {
      setDraft({ kind: "arrow", color: penColor, x1: w.x, y1: w.y, x2: w.x, y2: w.y });
    }
    drag.current = { mode: "draw" };
  };

  const startNoteDrag = (e, note) => {
    e.stopPropagation();
    onSelectNote(note.id);
    drag.current = {
      mode: "note",
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: note.x, y: note.y },
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      if (d.mode === "pan") {
        setView((v) => ({
          ...v,
          x: d.origin.x + (e.clientX - d.startX),
          y: d.origin.y + (e.clientY - d.startY),
        }));
      } else if (d.mode === "note") {
        const s = viewRef.current.scale;
        onUpdateNote(d.id, {
          x: d.origin.x + (e.clientX - d.startX) / s,
          y: d.origin.y + (e.clientY - d.startY) / s,
        });
      } else if (d.mode === "draw") {
        const w = toWorld(e.clientX, e.clientY);
        setDraft((prev) => {
          if (!prev) return prev;
          if (prev.kind === "path") return { ...prev, points: [...prev.points, w] };
          if (prev.kind === "rect")
            return {
              ...prev,
              x: Math.min(prev._sx, w.x),
              y: Math.min(prev._sy, w.y),
              w: Math.abs(w.x - prev._sx),
              h: Math.abs(w.y - prev._sy),
            };
          if (prev.kind === "arrow") return { ...prev, x2: w.x, y2: w.y };
          return prev;
        });
      } else if (d.mode === "erase") {
        eraseAt(toWorld(e.clientX, e.clientY));
      }
    };
    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      if (d && d.mode === "draw") {
        const cur = draftRef.current;
        setDraft(null);
        if (cur) commitDrawing(cur);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdateNote, onDeleteDrawing]);

  const commitDrawing = (d) => {
    if (d.kind === "path" && d.points.length < 2) return;
    if (d.kind === "rect" && d.w < 4 && d.h < 4) return;
    if (d.kind === "arrow" && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) < 4) return;
    const { _sx, _sy, ...clean } = d;
    onAddDrawing(clean);
  };

  /* ------------------------------------------------------- zoom / notes */
  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY);
  };

  const zoomAt = (factor, cx, cy) => {
    const rect = surfaceRef.current.getBoundingClientRect();
    const px = (cx ?? rect.left + rect.width / 2) - rect.left;
    const py = (cy ?? rect.top + rect.height / 2) - rect.top;
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      const k = scale / v.scale;
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  const addAtCenter = () => {
    const rect = surfaceRef.current.getBoundingClientRect();
    onAddNote({
      x: (rect.width / 2 - view.x) / view.scale - NOTE_W / 2,
      y: (rect.height / 2 - view.y) / view.scale - 40,
    });
  };

  const onSurfaceDoubleClick = (e) => {
    if (tool !== "select" || e.target !== surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    onAddNote({
      x: (e.clientX - rect.left - view.x) / view.scale - NOTE_W / 2,
      y: (e.clientY - rect.top - view.y) / view.scale - 40,
    });
  };

  const drawings = board.drawings || [];
  const renderList = draft ? [...drawings, draft] : drawings;

  return (
    <main className="board">
      <div className="board-toolbar">
        <input
          className="title-input board-title"
          value={board.title}
          placeholder="Untitled board"
          onChange={(e) => onRename(e.target.value)}
        />

        <div className="board-tools">
          <div className="tool-group">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className={`tool-btn ${tool === t.id ? "active" : ""}`}
                title={t.label}
                onClick={() => setTool(t.id)}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {tool !== "select" && tool !== "eraser" && (
            <div className="pen-palette">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  className={`pen-swatch ${penColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setPenColor(c)}
                />
              ))}
            </div>
          )}

          <button className="btn tiny" onClick={addAtCenter}>
            ＋ Note
          </button>

          <div className="zoom-controls">
            <button className="icon-btn" onClick={() => zoomAt(0.9)} title="Zoom out">
              −
            </button>
            <span className="zoom-label">{Math.round(view.scale * 100)}%</span>
            <button className="icon-btn" onClick={() => zoomAt(1.1)} title="Zoom in">
              ＋
            </button>
            <button
              className="icon-btn"
              onClick={() => setView({ x: 0, y: 0, scale: 1 })}
              title="Reset view"
            >
              ⤢
            </button>
          </div>

          {drawings.length > 0 && (
            <button
              className="btn tiny ghost"
              onClick={() => confirm("Clear all drawings?") && onClearDrawings()}
              title="Clear drawings"
            >
              Clear ink
            </button>
          )}

          <span className="board-count">
            {board.nodes.length} notes · {drawings.length} drawings
          </span>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`board-surface ${drawingMode ? "drawing" : ""} ${
          tool === "eraser" ? "erasing" : ""
        }`}
        onMouseDown={onSurfaceMouseDown}
        onDoubleClick={onSurfaceDoubleClick}
        onWheel={onWheel}
      >
        <div
          className="board-layer"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <svg className="draw-layer" width="1" height="1">
            {renderList.map((d, i) => (
              <Drawing key={d.id || `draft-${i}`} d={d} />
            ))}
          </svg>

          {board.nodes.map((note) => (
            <Note
              key={note.id}
              note={note}
              selected={note.id === selectedNoteId}
              onDragStart={(e) => startNoteDrag(e, note)}
              onChange={(patch) => onUpdateNote(note.id, patch)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))}
        </div>

        <Cursors surfaceRef={surfaceRef} presence={presence} />

        {board.nodes.length === 0 && drawings.length === 0 && (
          <div className="board-hint">
            Pick a tool to draw, double-click to add a note, or use the AI panel →
          </div>
        )}
      </div>
    </main>
  );
}

/* --------------------------------------------------------------- drawings */

function Drawing({ d }) {
  if (d.kind === "path") {
    const dAttr = d.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return (
      <path
        d={dAttr}
        fill="none"
        stroke={d.color}
        strokeWidth={d.width || 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (d.kind === "rect") {
    return (
      <rect
        x={d.x}
        y={d.y}
        width={d.w}
        height={d.h}
        rx="6"
        fill="none"
        stroke={d.color}
        strokeWidth="2.5"
      />
    );
  }
  if (d.kind === "arrow") {
    const angle = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
    const h = 12;
    const a1 = angle - Math.PI / 7;
    const a2 = angle + Math.PI / 7;
    return (
      <g stroke={d.color} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
        <line x1={d.x2} y1={d.y2} x2={d.x2 - h * Math.cos(a1)} y2={d.y2 - h * Math.sin(a1)} />
        <line x1={d.x2} y1={d.y2} x2={d.x2 - h * Math.cos(a2)} y2={d.y2 - h * Math.sin(a2)} />
      </g>
    );
  }
  return null;
}

/* ----------------------------------------------------------------- a note */

function Note({ note, selected, onDragStart, onChange, onDelete }) {
  const [showColors, setShowColors] = useState(false);
  return (
    <div
      className={`note ${selected ? "selected" : ""}`}
      style={{ left: note.x, top: note.y, background: note.color, width: NOTE_W }}
    >
      <div className="note-bar" onMouseDown={onDragStart}>
        <button
          className="note-color"
          style={{ background: shade(note.color) }}
          onClick={(e) => {
            e.stopPropagation();
            setShowColors((s) => !s);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Color"
        />
        <span className="note-grip">⠿</span>
        <button
          className="note-del"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          title="Delete note"
        >
          ✕
        </button>
      </div>
      {showColors && (
        <div className="note-palette" onMouseDown={(e) => e.stopPropagation()}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              style={{ background: c }}
              onClick={() => {
                onChange({ color: c });
                setShowColors(false);
              }}
            />
          ))}
        </div>
      )}
      <textarea
        className="note-text"
        value={note.text}
        placeholder="Type an idea…"
        onChange={(e) => onChange({ text: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ----------------------------------------- simulated live teammate cursors */

function Cursors({ surfaceRef, presence }) {
  const active = presence.filter((p) => p.status === "editing").slice(0, 2);
  const people = active.length ? active : presence.slice(0, 1);
  const [pos, setPos] = useState({});

  useEffect(() => {
    const move = () => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = {};
      people.forEach((p) => {
        next[p.id] = {
          x: 40 + Math.random() * (rect.width - 120),
          y: 60 + Math.random() * (rect.height - 140),
        };
      });
      setPos(next);
    };
    move();
    const t = setInterval(move, 1600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presence]);

  return (
    <>
      {people.map((p) => {
        const pt = pos[p.id];
        if (!pt) return null;
        return (
          <div
            key={p.id}
            className="live-cursor"
            style={{ transform: `translate(${pt.x}px, ${pt.y}px)`, color: p.color }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={p.color}>
              <path d="M4 2l7 18 2.5-7.5L21 10z" />
            </svg>
            <span className="cursor-tag" style={{ background: p.color }}>
              {p.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ utils */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Is world point `w` within radius `r` of drawing `d`?
function hitTest(d, w, r) {
  if (d.kind === "path") {
    return d.points.some((p) => Math.hypot(p.x - w.x, p.y - w.y) <= r + (d.width || 3));
  }
  if (d.kind === "rect") {
    return (
      w.x >= d.x - r &&
      w.x <= d.x + d.w + r &&
      w.y >= d.y - r &&
      w.y <= d.y + d.h + r
    );
  }
  if (d.kind === "arrow") {
    return pointSegDist(w, { x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) <= r + 3;
  }
  return false;
}

function pointSegDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Slightly darken a hex color for the note's color dot.
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r},${g},${b})`;
}
