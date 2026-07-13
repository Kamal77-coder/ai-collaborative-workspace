import { useState } from "react";

/** Threaded comments for the active document. */
export default function CommentsPanel({ comments, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  };

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div className="comments">
      <div className="comment-composer">
        <textarea
          rows={2}
          placeholder="Leave a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <button className="btn tiny primary" disabled={!text.trim()} onClick={submit}>
          Comment
        </button>
      </div>

      {comments.length === 0 && (
        <p className="muted">No comments yet. Start a thread above.</p>
      )}

      {open.map((c) => (
        <Comment key={c.id} c={c} onToggle={onToggle} onDelete={onDelete} />
      ))}

      {resolved.length > 0 && (
        <>
          <div className="comments-divider">Resolved ({resolved.length})</div>
          {resolved.map((c) => (
            <Comment key={c.id} c={c} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </>
      )}
    </div>
  );
}

function Comment({ c, onToggle, onDelete }) {
  return (
    <div className={`comment ${c.resolved ? "resolved" : ""}`}>
      <div className="comment-head">
        <strong>{c.author}</strong>
        <button className="icon-btn" title="Delete" onClick={() => onDelete(c.id)}>
          ✕
        </button>
      </div>
      <div className="comment-text">{c.text}</div>
      <button className="linklike" onClick={() => onToggle(c.id)}>
        {c.resolved ? "Reopen" : "Resolve"}
      </button>
    </div>
  );
}
