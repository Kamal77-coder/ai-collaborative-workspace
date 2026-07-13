/** Left rail: two sections — Documents and Boards — each with create/delete. */
export default function Sidebar({
  documents,
  boards,
  activeView,
  activeDocId,
  activeBoardId,
  onSelectDoc,
  onSelectBoard,
  onCreateDoc,
  onCreateBoard,
  onDeleteDoc,
  onDeleteBoard,
}) {
  return (
    <aside className="sidebar">
      <Section
        label="Documents"
        icon="📄"
        onCreate={onCreateDoc}
        items={documents}
        activeId={activeView === "docs" ? activeDocId : null}
        onSelect={onSelectDoc}
        onDelete={onDeleteDoc}
        emptyLabel="No documents yet."
      />
      <Section
        label="Boards"
        icon="🗂"
        onCreate={onCreateBoard}
        items={boards}
        activeId={activeView === "boards" ? activeBoardId : null}
        onSelect={onSelectBoard}
        onDelete={onDeleteBoard}
        emptyLabel="No boards yet."
      />
    </aside>
  );
}

function Section({ label, icon, onCreate, items, activeId, onSelect, onDelete, emptyLabel }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-head">
        <span>{label}</span>
        <button className="btn tiny primary" onClick={onCreate} title={`New ${label.slice(0, -1)}`}>
          + New
        </button>
      </div>
      <ul className="doc-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`doc-item ${item.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="doc-item-main">
              <div className="doc-title">
                <span className="doc-icon">{icon}</span>
                {item.title || "Untitled"}
              </div>
              <div className="doc-meta">{relativeTime(item.updatedAt)}</div>
            </div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${item.title || "Untitled"}"?`)) onDelete(item.id);
              }}
            >
              ✕
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="doc-empty">{emptyLabel}</li>}
      </ul>
    </div>
  );
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
