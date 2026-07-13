/**
 * Thin localStorage-backed persistence layer.
 * The whole workspace is a single JSON blob keyed by APP_KEY.
 */

const APP_KEY = "synapse.workspace.v2";
const SETTINGS_KEY = "synapse.settings.v1";

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(state) {
  try {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* non-fatal */
  }
}
