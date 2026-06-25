import { MongoClient } from "mongodb";
import { getResolvedMongoUri } from "@/lib/dns-fix";

/**
 * Returns a cached MongoClient. The NextAuth MongoDBAdapter wants a raw
 * `MongoClient` (not Mongoose), so we keep this parallel connection layer.
 */
const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = globalThis._mongoClient;

async function buildClient() {
  const uri = (await getResolvedMongoUri()) || MONGODB_URI;
  return new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
}

if (!cachedClient && MONGODB_URI) {
  // Eagerly build so the adapter sees a real client by first call.
  // Use a pending sentinel and resolve on demand.
  cachedClient = globalThis._mongoClient = { _pending: buildClient() };
}

export async function getMongoClient() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }
  if (cachedClient && cachedClient._pending) {
    const client = await cachedClient._pending;
    cachedClient = globalThis._mongoClient = client;
  }
  return cachedClient;
}

export async function getDB() {
  const client = await getMongoClient();
  await client.connect();
  const effectiveUri = client.options?.url || MONGODB_URI;
  const dbName = new URL(effectiveUri.replace("mongodb://", "http://")).pathname
    .replace(/^\//, "")
    .split("?")[0] || "hackathon";
  return client.db(dbName);
}