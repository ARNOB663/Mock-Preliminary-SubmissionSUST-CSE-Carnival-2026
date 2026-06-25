import { MongoClient } from "mongodb";

/**
 * Returns a cached MongoClient. The NextAuth MongoDBAdapter wants a raw
 * `MongoClient` (not Mongoose), so we keep this parallel connection layer.
 *
 * If MONGODB_URI is unset we return a dummy client object that will throw
 * on use — this lets the app boot for static pages without credentials.
 */
const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = globalThis._mongoClient;

if (!cachedClient && MONGODB_URI) {
  cachedClient = globalThis._mongoClient = new MongoClient(MONGODB_URI);
}

export function getMongoClient() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }
  return cachedClient;
}

export async function getDB() {
  const client = getMongoClient();
  await client.connect();
  // Database name from the URI's path, defaulting to "hackathon"
  const dbName = new URL(MONGODB_URI.replace("mongodb://", "http://")).pathname
    .replace(/^\//, "")
    .split("?")[0] || "hackathon";
  return client.db(dbName);
}