import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "../lib/markdown.js";

/**
 * Center pane: title + Markdown body editor with a live-preview toggle.
 * Selection is lifted to the parent so the AI assistant can insert/replace text.
 */
export default function Editor({
  doc,
  selection,
  onSelectionChange,
  onContentChange,
  onTitleChange,
}) {
  const textareaRef = useRef(null);
  const [preview, setPreview] = useState(false);

  // When the parent changes the selection programmatically (e.g. after an AI
  // insert), reflect it in the actual textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || preview) return;
    if (
      el.selectionStart !== selection.start ||
      el.selectionEnd !== selection.end
    ) {
      el.setSelectionRange(selection.start, selection.end);
    }
  }, [selection, preview, doc.content]);

  const syncSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    onSelectionChange({ start: el.selectionStart, end: el.selectionEnd });
  };

  const words = (doc.content.trim().match(/\S+/g) || []).length;
  const chars = doc.content.length;

  return (
    <main className="editor">
      <div className="editor-head">
        <input
          className="title-input"
          value={doc.title}
          placeholder="Untitled document"
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <button
          className={`btn ghost tiny ${preview ? "active" : ""}`}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "✎ Edit" : "👁 Preview"}
        </button>
      </div>

      <div className="editor-body">
        {preview ? (
          <div
            className="markdown-preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={doc.content}
            placeholder="Start writing, or ask the assistant to draft something…"
            onChange={(e) => onContentChange(e.target.value)}
            onSelect={syncSelection}
            onKeyUp={syncSelection}
            onClick={syncSelection}
            spellCheck
          />
        )}
      </div>

      <div className="editor-foot">
        <span>{words} words · {chars} chars</span>
        {selection.end > selection.start && (
          <span className="sel-hint">
            {selection.end - selection.start} selected — AI actions apply to the selection
          </span>
        )}
      </div>
    </main>
  );
}
