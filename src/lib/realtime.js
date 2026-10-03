import { API_BASE } from "./api";

// One shared WebSocket for the portal. Same protocol as the main site's and the
// admin app's clients (web-next-js/src/services/realtime/realtime-client.js,
// admin/src/lib/realtime.js); the apps live in separate repos, so keep all three in step.
//
//   const unsubscribe = realtime.subscribe("stcet.tests.changed", (data) => { ... });
//   const leave = realtime.joinTopic("stcet:tests");
//
// Frames from the server are JSON: { type, data, topic?, sentAt }.

export const RealtimeStatus = {
  IDLE: "idle",
  CONNECTING: "connecting",
  OPEN: "open",
  RECONNECTING: "reconnecting",
};

export const RealtimeEvents = {
  STCET_TESTS_CHANGED: "stcet.tests.changed",
  USER_UPDATED: "user.updated",
  SESSION_ENDED: "session.ended",
};

export const STCET_TESTS_TOPIC = "stcet:tests";

// Session expired, or the account was deactivated: reconnecting cannot succeed.
const TERMINAL_CLOSE_CODES = new Set([4001, 4003]);
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30000;

// The socket lives at /api/ws on the API host, whatever path the REST base uses.
function resolveUrl() {
  const url = import.meta.env.VITE_WS_URL
    ? new URL(import.meta.env.VITE_WS_URL, window.location.href)
    : new URL("/api/ws", new URL(API_BASE, window.location.href));
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  return url.toString();
}

class RealtimeClient {
  #socket = null;
  #status = RealtimeStatus.IDLE;
  #shouldConnect = false;
  #attempt = 0;
  #reconnectTimer = null;
  #listeners = new Map();
  #statusListeners = new Set();
  #topics = new Map();
  #wakeListenersAdded = false;

  get status() {
    return this.#status;
  }

  connect() {
    this.#shouldConnect = true;
    this.#addWakeListeners();
    if (this.#socket || this.#reconnectTimer) return;
    this.#open();
  }

  disconnect() {
    this.#shouldConnect = false;
    this.#attempt = 0;
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;

    const socket = this.#socket;
    this.#socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close(1000, "Client disconnect");
    }
    this.#setStatus(RealtimeStatus.IDLE);
  }

  /** Listen for one event type, or "*" for every event. Returns an unsubscribe function. */
  subscribe(type, handler) {
    const handlers = this.#listeners.get(type) || new Set();
    handlers.add(handler);
    this.#listeners.set(type, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.#listeners.delete(type);
    };
  }

  /** Asks the server for events on a topic. Returns a function that leaves it. */
  joinTopic(topic) {
    const count = this.#topics.get(topic) || 0;
    this.#topics.set(topic, count + 1);
    if (count === 0) this.send("subscribe", { topic });

    let left = false;
    return () => {
      if (left) return;
      left = true;
      const current = this.#topics.get(topic) || 0;
      if (current <= 1) {
        this.#topics.delete(topic);
        this.send("unsubscribe", { topic });
      } else {
        this.#topics.set(topic, current - 1);
      }
    };
  }

  onStatusChange(handler) {
    this.#statusListeners.add(handler);
    return () => this.#statusListeners.delete(handler);
  }

  /** Sends { type, data } to the server. Returns false when the socket is not open. */
  send(type, data) {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(JSON.stringify({ type, data }));
    return true;
  }

  #open() {
    this.#setStatus(
      this.#attempt === 0 ? RealtimeStatus.CONNECTING : RealtimeStatus.RECONNECTING
    );

    const socket = new WebSocket(resolveUrl());
    this.#socket = socket;

    socket.onopen = () => {
      this.#attempt = 0;
      for (const topic of this.#topics.keys()) this.send("subscribe", { topic });
      this.#setStatus(RealtimeStatus.OPEN);
    };
    socket.onmessage = (event) => this.#dispatch(event.data);
    socket.onclose = (event) => {
      if (this.#socket !== socket) return;
      this.#socket = null;

      if (!this.#shouldConnect || TERMINAL_CLOSE_CODES.has(event.code)) {
        this.#shouldConnect = false;
        this.#setStatus(RealtimeStatus.IDLE);
        return;
      }
      this.#scheduleReconnect();
    };
  }

  #scheduleReconnect() {
    const backoff = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** this.#attempt);
    const delay = backoff / 2 + Math.random() * (backoff / 2);
    this.#attempt += 1;
    this.#setStatus(RealtimeStatus.RECONNECTING);

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (this.#shouldConnect && !this.#socket) this.#open();
    }, delay);
  }

  #reconnectNow = () => {
    if (!this.#shouldConnect || this.#socket) return;
    if (document.visibilityState === "hidden") return;
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#open();
  };

  #addWakeListeners() {
    if (this.#wakeListenersAdded) return;
    this.#wakeListenersAdded = true;
    window.addEventListener("online", this.#reconnectNow);
    document.addEventListener("visibilitychange", this.#reconnectNow);
  }

  #dispatch(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || typeof message.type !== "string") return;

    const handlers = [
      ...(this.#listeners.get(message.type) || []),
      ...(this.#listeners.get("*") || []),
    ];
    for (const handler of handlers) {
      try {
        handler(message.data, message);
      } catch (error) {
        console.error(`Realtime handler for "${message.type}" failed:`, error);
      }
    }
  }

  #setStatus(status) {
    if (this.#status === status) return;
    this.#status = status;
    for (const handler of this.#statusListeners) handler(status);
  }
}

export const realtime = new RealtimeClient();
