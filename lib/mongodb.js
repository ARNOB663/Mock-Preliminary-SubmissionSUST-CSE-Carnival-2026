import mongoose from "mongoose";

/**
 * Cached Mongoose connection. Next.js dev mode hot-reloads modules,
 * which would otherwise create a new connection on every reload and
 * exhaust MongoDB's connection pool. We cache the connection on the
 * global object so it survives HMR.
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // We don't throw here so the app can still boot without DB creds
  // (useful for the landing page). APIs that need DB will fail loudly.
  console.warn(
    "[mongodb] MONGODB_URI is not set — DB-backed features will not work."
  );
}

/** @type {typeof mongoose | null} */
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

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}