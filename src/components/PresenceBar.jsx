/** Real presence: avatars for the people currently connected to this room. */
export default function PresenceBar({ users, you, connected, show }) {
  const others = show ? users.filter((u) => u.id !== you.id) : [];
  return (
    <div className="presence" title="People viewing this item">
      {others.map((p) => (
        <div key={p.id} className="avatar-wrap" title={p.name}>
          <div className="avatar" style={{ background: p.color }}>
            {initials(p.name)}
          </div>
        </div>
      ))}
      <div className="avatar-wrap" title={`${you.name} (you)`}>
        <div className="avatar you" style={{ background: you.color }}>
          {initials(you.name)}
        </div>
      </div>
      <span className={`rt-dot ${connected ? "on" : "off"}`} title={connected ? "Live — connected" : "Offline — start the server with npm run server"} />
    </div>
  );
}

function initials(name) {
  const parts = (name || "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
