"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import PusherClient from "pusher-js";

const PusherContext = createContext({
  client: null,
  subscribe: () => () => {},
  enabled: false,
});

/**
 * Pusher client provider. Renders children even when Pusher isn't configured
 * (subscribe() becomes a no-op), so the rest of the app keeps working.
 */
export function PusherProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;
    try {
      const client = new PusherClient(key, { cluster });
      clientRef.current = client;
      setEnabled(true);
    } catch (err) {
      console.error("[pusher-client] init failed:", err);
    }
    return () => {
      try {
        clientRef.current?.disconnect();
      } catch {}
      clientRef.current = null;
      setEnabled(false);
    };
  }, []);

  function subscribe(channel, event, handler) {
    const c = clientRef.current;
    if (!c) return () => {};
    const ch = c.subscribe(channel);
    ch.bind(event, handler);
    return () => {
      try {
        ch.unbind(event, handler);
        c.unsubscribe(channel);
      } catch {}
    };
  }

  return (
    <PusherContext.Provider value={{ client: clientRef.current, subscribe, enabled }}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}