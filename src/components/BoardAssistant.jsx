import { useState } from "react";
import { streamClaude } from "../lib/ai.js";
import { demoIdeas, demoExpand, demoBoardSummary } from "../lib/demo.js";
import {
  SYSTEM_PROMPT,
  buildIdeasMessage,
  buildExpandNoteMessage,
  buildBoardSummaryMessage,
  parseLines,
} from "../lib/prompts.js";

/**
 * Board-mode AI tools:
 *  - Generate ideas from a topic → drop them as notes.
 *  - Expand the selected note → 3 related notes.
 *  - Summarize the whole board → a new document.
 */
export default function BoardAssistant({
  settings,
  board,
  selectedNote,
  onAddNotes,
  onCreateDocFromText,
  onOpenSettings,
}) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const usingRealAI = !settings.demoMode && !!settings.apiKey;

  // Collect a full (non-streamed) completion from Claude.
  async function complete(userMsg) {
    let text = "";
    for await (const delta of streamClaude({
      apiKey: settings.apiKey,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 1000,
    })) {
      text += delta;
    }
    return text;
  }

  async function generateIdeas() {
    if (!topic.trim()) {
      setError("Enter a topic to brainstorm.");
      return;
    }
    await withBusy("ideas", async () => {
      const ideas = usingRealAI
        ? parseLines(await complete(buildIdeasMessage(topic.trim())), 6)
        : demoIdeas(topic.trim());
      if (!ideas.length) throw new Error("No ideas came back — try again.");
      onAddNotes(ideas);
      setStatus(`Added ${ideas.length} idea notes.`);
    });
  }

  async function expandNote() {
    if (!selectedNote) return;
    const seed = (selectedNote.text || "").trim();
    if (!seed) {
      setError("The selected note is empty — write something first.");
      return;
    }
    await withBusy("expand", async () => {
      const ideas = usingRealAI
        ? parseLines(await complete(buildExpandNoteMessage(seed)), 3)
        : demoExpand(seed);
      onAddNotes(ideas);
      setStatus(`Expanded into ${ideas.length} notes.`);
    });
  }

  async function summarize() {
    const notes = (board?.nodes || []).map((n) => n.text).filter((t) => t.trim());
    if (!notes.length) {
      setError("Add some notes to summarize first.");
      return;
    }
    await withBusy("summary", async () => {
      const text = usingRealAI
        ? await complete(buildBoardSummaryMessage(notes))
        : demoBoardSummary(notes);
      onCreateDocFromText(`${board.title} — brief`, text);
      setStatus("Created a document from this board.");
    });
  }

  async function withBusy(key, fn) {
    setError("");
    setStatus("");
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="assistant">
      {!usingRealAI && (
        <div className="notice">
          Running in <strong>demo mode</strong>.{" "}
          <button className="linklike" onClick={onOpenSettings}>
            Add a Claude key
          </button>{" "}
          for real, topic-aware ideas.
        </div>
      )}

      <section className="assistant-section">
        <h4>Generate ideas</h4>
        <input
          className="text-input"
          placeholder="Topic to brainstorm…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          className="btn primary full"
          style={{ marginTop: 8 }}
          disabled={!!busy}
          onClick={generateIdeas}
        >
          {busy === "ideas" ? "Generating…" : "✨ Generate 6 ideas → notes"}
        </button>
      </section>

      <section className="assistant-section">
        <h4>Expand a note</h4>
        {selectedNote ? (
          <p className="muted small">
            Selected: “{(selectedNote.text || "empty note").slice(0, 40)}”
          </p>
        ) : (
          <p className="muted small">Select a note on the board to expand it.</p>
        )}
        <button
          className="btn full"
          disabled={!selectedNote || !!busy}
          onClick={expandNote}
        >
          {busy === "expand" ? "Expanding…" : "➕ Expand into 3 related notes"}
        </button>
      </section>

      <section className="assistant-section">
        <h4>Wrap up</h4>
        <button className="btn full" disabled={!!busy} onClick={summarize}>
          {busy === "summary" ? "Summarizing…" : "📄 Summarize board → document"}
        </button>
      </section>

      {status && <div className="board-status ok">{status}</div>}
      {error && <div className="output-error">{error}</div>}

      <p className="muted small tip">
        Tip: double-click the canvas to add a note. Hold ⌘/Ctrl and scroll to zoom.
      </p>
    </div>
  );
}
