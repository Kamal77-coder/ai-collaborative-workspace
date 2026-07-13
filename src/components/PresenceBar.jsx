/** Simulated real-time presence: teammate avatars with live status. */
const STATUS_LABEL = {
  editing: "editing",
  viewing: "viewing",
  idle: "idle",
  commenting: "commenting",
};

export default function PresenceBar({ presence, show }) {
  return (
    <div className="presence" title="People in this workspace">
      {show &&
        presence.map((p) => (
          <div
            key={p.id}
            className="avatar-wrap"
            title={`${p.name} · ${STATUS_LABEL[p.status]}`}
          >
            <div className="avatar" style={{ background: p.color }}>
              {p.initials}
              <span className={`status-ring ${p.status}`} />
            </div>
          </div>
        ))}
      <div className="avatar-wrap" title="You">
        <div className="avatar you" style={{ background: "#f59e0b" }}>
          YO
        </div>
      </div>
    </div>
  );
}
