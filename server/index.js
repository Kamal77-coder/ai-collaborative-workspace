/**
 * Synapse realtime server.
 *
 * A tiny WebSocket relay for collaboration signals: presence (who's here) and
 * live cursors, scoped to "rooms" (one per open document or board). It does not
 * store documents — the client owns that — it only fans out ephemeral signals to
 * everyone else in the same room.
 *
 * Run: `node server/index.js` (or `npm run server`, or `npm run dev` for both
 * the web app and this server together).
 */
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8787;
const wss = new WebSocketServer({ port: PORT });

/** room id -> Set<ws> */
const rooms = new Map();

function join(ws, room) {
  leave(ws);
  ws.room = room;
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
}

function leave(ws) {
  const set = ws.room && rooms.get(ws.room);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(ws.room);
  }
  ws.room = null;
}

/** Send the current member list to everyone in a room. */
function broadcastPresence(room) {
  const set = rooms.get(room);
  if (!set) return;
  const users = [...set].map((c) => c.user).filter(Boolean);
  const msg = JSON.stringify({ type: "presence", users });
  for (const c of set) safeSend(c, msg);
}

/** Relay a message to everyone in the room except the sender. */
function relay(ws, obj) {
  const set = rooms.get(ws.room);
  if (!set) return;
  const msg = JSON.stringify(obj);
  for (const c of set) if (c !== ws) safeSend(c, msg);
}

function safeSend(ws, msg) {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(msg);
    } catch {
      /* ignore */
    }
  }
}

wss.on("connection", (ws) => {
  ws.room = null;
  ws.user = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "join": {
        ws.user = msg.user; // { id, name, color }
        join(ws, msg.room);
        broadcastPresence(msg.room);
        break;
      }
      case "status": {
        if (ws.user) ws.user.status = msg.status;
        broadcastPresence(ws.room);
        break;
      }
      case "cursor": {
        // { x, y } in the sender's content-area coordinates.
        relay(ws, { type: "cursor", id: ws.user?.id, user: ws.user, x: msg.x, y: msg.y });
        break;
      }
      case "cursor-leave": {
        relay(ws, { type: "cursor-leave", id: ws.user?.id });
        break;
      }
      default:
        break;
    }
  });

  ws.on("close", () => {
    const room = ws.room;
    const id = ws.user?.id;
    leave(ws);
    if (room) {
      broadcastPresence(room);
      if (id) {
        const set = rooms.get(room);
        if (set) for (const c of set) safeSend(c, JSON.stringify({ type: "cursor-leave", id }));
      }
    }
  });
});

console.log(`[synapse] realtime server listening on ws://localhost:${PORT}`);
