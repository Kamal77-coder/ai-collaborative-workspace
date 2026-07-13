import { useEffect, useRef, useState } from "react";
import { NOTE_COLORS } from "../lib/seed.js";

const NOTE_W = 190;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.2;

/**
 * Infinite-ish whiteboard: pan the canvas, zoom, and drag/edit colored sticky
 * notes. Notes live in "world" coordinates; the canvas layer is translated and
 * scaled by `view`. Simulated teammate cursors drift across the surface.
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
}) {
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const surfaceRef = useRef(null);
  // Mutable drag state kept in a ref so listeners see fresh values.
  const drag = useRef(null);

  /* ------------------------------------------------------- pan the canvas */
  const onSurfaceMouseDown = (e) => {
    if (e.target !== surfaceRef.current) return; // only when hitting the background
    onSelectNote(null);
    drag.current = {
      mode: "pan",
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...view },
    };
  };

  /* ------------------------------------------------------- drag a note */
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
        const dx = (e.clientX - d.startX) / view.scale;
        const dy = (e.clientY - d.startY) / view.scale;
        onUpdateNote(d.id, { x: d.origin.x + dx, y: d.origin.y + dy });
      }
    };
    const onUp = () => (drag.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [view.scale, onUpdateNote]);

  /* ------------------------------------------------------- zoom (wheel) */
  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // let normal scroll pass through
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

  /* ------------------------------------------------------- add a note */
  const addAtCenter = () => {
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = (rect.width / 2 - view.x) / view.scale - NOTE_W / 2;
    const y = (rect.height / 2 - view.y) / view.scale - 40;
    onAddNote({ x, y });
  };

  const onSurfaceDoubleClick = (e) => {
    if (e.target !== surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - view.x) / view.scale - NOTE_W / 2;
    const y = (e.clientY - rect.top - view.y) / view.scale - 40;
    onAddNote({ x, y });
  };

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
          <span className="board-count">{board.nodes.length} notes</span>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className="board-surface"
        onMouseDown={onSurfaceMouseDown}
        onDoubleClick={onSurfaceDoubleClick}
        onWheel={onWheel}
      >
        <div
          className="board-layer"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
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

        {board.nodes.length === 0 && (
          <div className="board-hint">
            Double-click anywhere to add a note, or use the AI panel to generate ideas →
          </div>
        )}
      </div>
    </main>
  );
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

// Slightly darken a hex color for the note's color dot.
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r},${g},${b})`;
}
