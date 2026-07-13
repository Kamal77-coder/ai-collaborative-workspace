/**
 * Realtime client — a thin wrapper over a WebSocket connection to the Synapse
 * relay server. Handles identity, room join, cursor broadcast (throttled), and
 * auto-reconnect. Exposes a tiny event API.
 *
 * If the server isn't running, this stays quietly "offline" and never throws —
 * the app remains fully usable single-player.
 */

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8787";

const ADJECTIVES = ["Swift", "Calm", "Bright", "Bold", "Keen", "Warm", "Lucid", "Brisk"];
const ANIMALS = ["Otter", "Falcon", "Fox", "Heron", "Lynx", "Wren", "Ibex", "Orca"];
const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ef4444"];

/** A stable identity for this browser tab (distinct per tab). */
export function makeIdentity() {
  const key = "synapse.identity";
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const id = "u_" + Math.random().toString(36).slice(2, 9);
  const identity = {
    id,
    name: `${r(ADJECTIVES)} ${r(ANIMALS)}`,
    color: r(COLORS),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(identity));
  } catch {
    /* ignore */
  }
  return identity;
}

export class Realtime {
  constructor(user) {
    this.user = user;
    this.room = null;
    this.ws = null;
    this.connected = false;
    this.listeners = {}; // event -> Set<fn>
    this._reconnectTimer = null;
    this._lastCursorSent = 0;
    this._closedByUser = false;
    this._connect();
  }

  on(event, fn) {
    (this.listeners[event] ||= new Set()).add(fn);
    return () => this.listeners[event]?.delete(fn);
  }

  _emit(event, payload) {
    this.listeners[event]?.forEach((fn) => fn(payload));
  }

  _connect() {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this._emit("status", { connected: true });
      if (this.room) this._send({ type: "join", room: this.room, user: this.user });
    };

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "presence") this._emit("presence", msg.users);
      else if (msg.type === "cursor") this._emit("cursor", msg);
      else if (msg.type === "cursor-leave") this._emit("cursor-leave", msg);
    };

    ws.onclose = () => {
      this.connected = false;
      this._emit("status", { connected: false });
      if (!this._closedByUser) this._scheduleReconnect();
    };

    ws.onerror = () => ws.close();
  }

  _scheduleReconnect() {
    if (this._reconnectTimer || this._closedByUser) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, 2000);
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /** Enter a room (document or board). Safe to call repeatedly. */
  join(room) {
    if (this.room === room) return;
    this.room = room;
    this._send({ type: "join", room, user: this.user });
  }

  /** Broadcast a cursor position (throttled to ~30fps). */
  cursor(x, y) {
    const now = Date.now();
    if (now - this._lastCursorSent < 33) return;
    this._lastCursorSent = now;
    this._send({ type: "cursor", x, y });
  }

  cursorLeave() {
    this._send({ type: "cursor-leave" });
  }

  destroy() {
    this._closedByUser = true;
    clearTimeout(this._reconnectTimer);
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }
}
