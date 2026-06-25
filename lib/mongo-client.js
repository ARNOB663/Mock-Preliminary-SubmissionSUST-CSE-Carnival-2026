import { MongoClient } from "mongodb";

/**
 * Returns a cached MongoClient. The NextAuth MongoDBAdapter wants a raw
 * `MongoClient` (not Mongoose), so we keep this parallel connection layer.
 */
const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = globalThis._mongoClient;

if (!cachedClient && MONGODB_URI) {
  cachedClient = globalThis._mongoClient = new MongoClient(MONGODB_URI);
}

export async function getMongoClient() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }
  return cachedClient;
}

export async function getDB() {
  const client = await getMongoClient();
  await client.connect();
  const dbName = new URL(MONGODB_URI.replace("mongodb://", "http://")).pathname
    .replace(/^\//, "")
    .split("?")[0] || "hackathon";
  return client.db(dbName);
}