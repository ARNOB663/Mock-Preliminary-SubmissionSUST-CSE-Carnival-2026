/**
 * One-time fix for the stale `username_1` index on the users collection.
 * The TechHire User model doesn't have a `username` field, but the cluster
 * still has a unique index from the original NextAuth boilerplate.
 *
 * Run: node scripts/fix-indexes.js
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";

console.log("Connecting...");
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;

const cols = await db.listCollections().toArray();
console.log("Collections:", cols.map((c) => c.name).join(", "));

for (const col of cols) {
  try {
    const indexes = await db.collection(col.name).indexes();
    for (const idx of indexes) {
      if (idx.name === "username_1") {
        console.log(`Dropping ${col.name}.${idx.name}...`);
        await db.collection(col.name).dropIndex("username_1");
        console.log("  dropped.");
      }
    }
  } catch (err) {
    console.warn(`  ${col.name}: ${err.message}`);
  }
}

console.log("Done.");
await mongoose.disconnect();