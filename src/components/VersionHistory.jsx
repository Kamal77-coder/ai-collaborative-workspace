/** Document version history: snapshot + restore. */
export default function VersionHistory({ versions, onSave, onRestore }) {
  return (
    <div className="versions">
      <button className="btn primary full" onClick={onSave}>
        ⑃ Save current version
      </button>

      {versions.length === 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          No saved versions yet. Snapshots are also created automatically before
          the AI rewrites the whole document.
        </p>
      )}

      <ul className="version-list">
        {versions.map((v) => (
          <li key={v.id} className="version-item">
            <div className="version-main">
              <div className="version-label">{v.label || "Snapshot"}</div>
              <div className="version-time">{when(v.at)}</div>
              <div
                className="version-preview"
                dangerouslySetInnerHTML={{ __html: v.content || "<em>empty</em>" }}
              />
            </div>
            <button
              className="btn tiny"
              onClick={() => {
                if (confirm("Restore this version? Your current text is snapshotted first."))
                  onRestore(v.id);
              }}
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function when(ts) {
  const d = new Date(ts);
  const min = Math.round((Date.now() - ts) / 60000);
  const rel = min < 1 ? "just now" : min < 60 ? `${min}m ago` : `${Math.round(min / 60)}h ago`;
  return `${rel} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
