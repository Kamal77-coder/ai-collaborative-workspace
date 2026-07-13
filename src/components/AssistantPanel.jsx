import { useRef, useState } from "react";
import { streamClaude } from "../lib/ai.js";
import { streamDemo } from "../lib/demo.js";
import {
  ACTIONS,
  TONES,
  TEMPLATES,
  SYSTEM_PROMPT,
  buildUserMessage,
} from "../lib/prompts.js";
import { renderMarkdown } from "../lib/markdown.js";

/**
 * The AI assistant. Runs quick actions on the document/selection, applies tone
 * rewrites, and generates fresh copy from templates or a freeform prompt. Streams
 * output live and lets the user insert or replace it in the editor.
 */
export default function AssistantPanel({
  settings,
  docContent,
  selectedText,
  onInsert,
  onReplace,
  onOpenSettings,
}) {
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [lastLabel, setLastLabel] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [templateInput, setTemplateInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const abortRef = useRef(null);

  const usingRealAI = !settings.demoMode && !!settings.apiKey;
  const context = (selectedText || docContent || "").trim();

  async function run(action, { label, promptText, needsText } = {}) {
    if (streaming) return;
    if (needsText && !context) {
      setError("Write or select some text first — this action needs content to work with.");
      return;
    }
    setError("");
    setOutput("");
    setLastLabel(label || action);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let gen;
      if (usingRealAI) {
        const userMsg = buildUserMessage(action, context, {
          tone,
          prompt: promptText,
        });
        gen = streamClaude({
          apiKey: settings.apiKey,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
          signal: controller.signal,
        });
      } else {
        gen = streamDemo({
          action,
          input: needsText ? context : promptText,
          signal: controller.signal,
        });
      }

      for await (const delta of gen) {
        setOutput((o) => o + delta);
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || String(e));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const stop = () => abortRef.current?.abort();

  const copy = () => navigator.clipboard?.writeText(output);

  return (
    <div className="assistant">
      {!usingRealAI && (
        <div className="notice">
          Running in <strong>demo mode</strong>.{" "}
          <button className="linklike" onClick={onOpenSettings}>
            Add a Claude key
          </button>{" "}
          for real, context-aware output.
        </div>
      )}

      <section className="assistant-section">
        <h4>Edit {selectedText ? "selection" : "document"}</h4>
        <div className="action-grid">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className="action-btn"
              disabled={streaming}
              onClick={() =>
                run(a.id, { label: a.label, needsText: a.needsText })
              }
            >
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        <div className="tone-row">
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            className="btn tiny"
            disabled={streaming}
            onClick={() =>
              run("tone", { label: `Tone: ${tone}`, needsText: true })
            }
          >
            Change tone
          </button>
        </div>
      </section>

      <section className="assistant-section">
        <h4>Generate from template</h4>
        <input
          className="text-input"
          placeholder="Topic or subject…"
          value={templateInput}
          onChange={(e) => setTemplateInput(e.target.value)}
        />
        <div className="chip-row">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="chip"
              disabled={streaming || !templateInput.trim()}
              title={!templateInput.trim() ? "Enter a topic first" : ""}
              onClick={() =>
                run("generate", {
                  label: t.label,
                  promptText: t.prompt + templateInput.trim(),
                })
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="assistant-section">
        <h4>Ask anything</h4>
        <textarea
          className="prompt-input"
          rows={2}
          placeholder="e.g. Write a headline for a productivity app launch"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          className="btn primary full"
          disabled={streaming || !prompt.trim()}
          onClick={() =>
            run("generate", { label: "Generated", promptText: prompt.trim() })
          }
        >
          {streaming ? "Generating…" : "Generate"}
        </button>
      </section>

      {(output || streaming || error) && (
        <section className="assistant-output">
          <div className="output-head">
            <span>{lastLabel || "Output"}</span>
            {streaming && (
              <button className="btn tiny ghost" onClick={stop}>
                ■ Stop
              </button>
            )}
          </div>

          {error ? (
            <div className="output-error">{error}</div>
          ) : (
            <div
              className="output-body markdown-preview"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(output) + (streaming ? "<span class='caret'>▍</span>" : ""),
              }}
            />
          )}

          {output && !streaming && !error && (
            <div className="output-actions">
              <button className="btn tiny primary" onClick={() => onInsert(output)}>
                ↳ Insert
              </button>
              <button className="btn tiny" onClick={() => onReplace(output)}>
                ⇄ Replace {selectedText ? "selection" : "doc"}
              </button>
              <button className="btn tiny ghost" onClick={copy}>
                ⧉ Copy
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
