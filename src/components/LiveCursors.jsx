/**
 * Overlay of other users' live cursors, positioned in workspace-relative
 * coordinates received over WebSocket. Smoothly interpolated via CSS transition.
 */
export default function LiveCursors({ cursors }) {
  const list = Object.entries(cursors);
  if (!list.length) return null;
  return (
    <div className="live-cursors">
      {list.map(([id, c]) => (
        <div
          key={id}
          className="live-cursor"
          style={{ transform: `translate(${c.x}px, ${c.y}px)`, color: c.user?.color }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={c.user?.color || "#888"}>
            <path d="M4 2l7 18 2.5-7.5L21 10z" />
          </svg>
          <span className="cursor-tag" style={{ background: c.user?.color || "#888" }}>
            {c.user?.name || "Guest"}
          </span>
        </div>
      ))}
    </div>
  );
}
