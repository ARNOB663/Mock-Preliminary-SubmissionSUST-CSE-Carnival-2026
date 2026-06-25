/**
 * Pusher server-side helper.
 *
 * Uses environment variables:
 *   PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER
 *
 * When any of these are missing, all trigger functions become no-ops —
 * the rest of the app keeps working (messages still persist to Mongo,
 * the client will fall back to polling).
 */
import Pusher from "pusher";

let pusher = null;
let enabled = false;

function getClient() {
  if (pusher) return pusher;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    enabled = false;
    return null;
  }
  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  enabled = true;
  return pusher;
}

export function pusherEnabled() {
  if (!enabled) getClient();
  return enabled;
}

export async function trigger(channel, event, payload) {
  const client = getClient();
  if (!client) return;
  try {
    await client.trigger(channel, event, payload);
  } catch (err) {
    console.error("[pusher] trigger failed:", err?.message);
  }
}

/** Channel name conventions used across the app. */
export const channels = {
  conversation: (id) => `conversation-${id}`,
  user: (userId) => `user-${userId}`,
};

export const events = {
  MESSAGE_NEW: "message:new",
  NOTIFICATION_NEW: "notification:new",
  APPLICATION_STATUS: "application:status",
};