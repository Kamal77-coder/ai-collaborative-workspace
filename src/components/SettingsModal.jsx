import { useState } from "react";
import { MODEL } from "../lib/ai.js";

/** Settings dialog: API key + demo-mode toggle. */
export default function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [demoMode, setDemoMode] = useState(settings.demoMode);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="field">
          <span>Claude API key</span>
          <input
            type="password"
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
          <small>
            Stored only in your browser's localStorage. Requests go directly to
            Anthropic's API — nothing is proxied through a third party. Get a key
            at{" "}
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            .
          </small>
        </label>

        <label className="field-inline">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          <span>
            Demo mode — use built-in canned responses instead of calling Claude
          </span>
        </label>

        <div className="model-note">
          Model: <code>{MODEL}</code> · streaming · adaptive thinking
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => onSave({ apiKey: apiKey.trim(), demoMode })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
