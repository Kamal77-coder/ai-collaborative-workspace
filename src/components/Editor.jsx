import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * Rich-text document editor built on TipTap (ProseMirror). Provides a WYSIWYG
 * surface with a formatting toolbar and built-in undo/redo (from StarterKit's
 * history). Content is HTML, reported to the parent on every update.
 */
export default function Editor({
  doc,
  onReady,
  onUpdate,
  onSelectionChange,
  onTitleChange,
  onSaveVersion,
}) {
  const editor = useEditor({
    extensions: [
      // StarterKit ships its own link in v3 — disable it so our configured
      // Link (below) is the single source of truth and there's no duplicate.
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "Start writing, or ask the assistant to draft something…",
      }),
    ],
    content: doc.content || "",
    onCreate: ({ editor }) => {
      onReady?.(editor);
      onUpdate?.({ html: editor.getHTML(), text: editor.getText() });
    },
    onUpdate: ({ editor }) => {
      onUpdate?.({ html: editor.getHTML(), text: editor.getText() });
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      onSelectionChange?.(editor.state.doc.textBetween(from, to, " "));
    },
  });

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const words = editor ? (editor.getText().trim().match(/\S+/g) || []).length : 0;

  const btn = (active, onClick, label, title, disabled = false) => (
    <button
      className={`fmt-btn ${active ? "active" : ""}`}
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <main className="editor">
      <div className="editor-head">
        <input
          className="title-input"
          value={doc.title}
          placeholder="Untitled document"
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {editor && (
        <div className="fmt-toolbar">
          {btn(false, () => editor.chain().focus().undo().run(), "↶", "Undo (⌘Z)", !editor.can().undo())}
          {btn(false, () => editor.chain().focus().redo().run(), "↷", "Redo (⌘⇧Z)", !editor.can().redo())}
          <span className="fmt-sep" />
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold")}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic")}
          {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S", "Strikethrough")}
          {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "‹›", "Inline code")}
          <span className="fmt-sep" />
          {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", "Heading 1")}
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "•", "Bullet list")}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1.", "Numbered list")}
          {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝", "Quote")}
          {btn(editor.isActive("link"), setLink, "🔗", "Link")}
          <span className="fmt-sep" />
          {btn(false, onSaveVersion, "⑃ Save version", "Snapshot this document to history")}
        </div>
      )}

      <div className="editor-body">
        <EditorContent editor={editor} className="tiptap-host" />
      </div>

      <div className="editor-foot">
        <span>{words} words</span>
        {selectedHint(editor)}
      </div>
    </main>
  );
}

function selectedHint(editor) {
  if (!editor) return null;
  const { from, to } = editor.state.selection;
  if (to <= from) return null;
  return (
    <span className="sel-hint">
      {to - from} selected — AI actions apply to the selection
    </span>
  );
}
