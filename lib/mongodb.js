import mongoose from "mongoose";
import { getResolvedMongoUri } from "@/lib/dns-fix";

/**
 * Cached Mongoose connection. Next.js dev mode hot-reloads modules,
 * which would otherwise create a new connection on every reload and
 * exhaust MongoDB's connection pool. We cache the connection on the
 * global object so it survives HMR.
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    "[mongodb] MONGODB_URI is not set — DB-backed features will not work."
  );
}

/** @type {{ conn: typeof mongoose | null, promise: Promise<typeof mongoose> | null }} */
let cached = globalThis._mongoose;

if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to .env.local before calling connectDB()."
    );
  }
  if (cached.conn) return cached.conn;

  // Pre-resolve the SRV URI via our custom Resolver (works around Windows
  // DoH-stub ECONNREFUSED on `dns.resolveSrv`).
  const resolvedUri = (await getResolvedMongoUri()) || MONGODB_URI;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(resolvedUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}