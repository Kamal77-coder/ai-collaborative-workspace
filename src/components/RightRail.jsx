import { useEffect, useState } from "react";
import AssistantPanel from "./AssistantPanel.jsx";
import BoardAssistant from "./BoardAssistant.jsx";
import CommentsPanel from "./CommentsPanel.jsx";
import ActivityFeed from "./ActivityFeed.jsx";

/**
 * Right rail. In "doc" mode it shows the writing assistant, comments, and
 * activity. In "board" mode it swaps the assistant for the board AI tools.
 */
export default function RightRail(props) {
  const { mode } = props;
  const [tab, setTab] = useState(mode === "board" ? "board" : "assistant");

  // Keep the active tab valid when switching between docs and boards.
  useEffect(() => {
    setTab(mode === "board" ? "board" : "assistant");
  }, [mode]);

  const commentCount = props.comments.filter((c) => !c.resolved).length;

  return (
    <aside className="rail">
      <div className="rail-tabs">
        {mode === "board" ? (
          <button
            className={tab === "board" ? "active" : ""}
            onClick={() => setTab("board")}
          >
            ✨ Board AI
          </button>
        ) : (
          <>
            <button
              className={tab === "assistant" ? "active" : ""}
              onClick={() => setTab("assistant")}
            >
              ✨ Assistant
            </button>
            <button
              className={tab === "comments" ? "active" : ""}
              onClick={() => setTab("comments")}
            >
              💬 Comments{commentCount > 0 && <span className="pill">{commentCount}</span>}
            </button>
          </>
        )}
        <button
          className={tab === "activity" ? "active" : ""}
          onClick={() => setTab("activity")}
        >
          📊 Activity
        </button>
      </div>

      <div className="rail-body">
        {tab === "assistant" && (
          <AssistantPanel
            settings={props.settings}
            docContent={props.docContent}
            selectedText={props.selectedText}
            onInsert={props.onInsert}
            onReplace={props.onReplace}
            onOpenSettings={props.onOpenSettings}
          />
        )}
        {tab === "board" && (
          <BoardAssistant
            settings={props.settings}
            board={props.board}
            selectedNote={props.selectedNote}
            onAddNotes={props.onAddNotes}
            onCreateDocFromText={props.onCreateDocFromText}
            onOpenSettings={props.onOpenSettings}
          />
        )}
        {tab === "comments" && (
          <CommentsPanel
            comments={props.comments}
            onAdd={props.onAddComment}
            onToggle={props.onToggleComment}
            onDelete={props.onDeleteComment}
          />
        )}
        {tab === "activity" && <ActivityFeed activity={props.activity} />}
      </div>
    </aside>
  );
}
