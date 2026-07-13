/** Workspace activity feed (a mix of your actions and simulated teammates). */
export default function ActivityFeed({ activity }) {
  if (!activity?.length) {
    return <p className="muted">No recent activity.</p>;
  }
  return (
    <ul className="activity">
      {activity.map((a) => (
        <li key={a.id}>
          <span className="activity-dot" />
          <div>
            <div className="activity-text">{a.text}</div>
            <div className="activity-time">{timeAgo(a.at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function timeAgo(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
