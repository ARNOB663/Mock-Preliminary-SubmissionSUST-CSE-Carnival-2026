import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing from .env.local");
  process.exit(1);
}

console.log("Connecting to MongoDB...");
const t = setTimeout(() => {
  console.error("TIMEOUT after 15s");
  process.exit(2);
}, 15000);

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  clearTimeout(t);
  console.log("OK — connected to", mongoose.connection.host);
  console.log("DB name:", mongoose.connection.name);
  const admin = mongoose.connection.db.admin();
  const ping = await admin.ping();
  console.log("Ping:", ping);
  // List collections.
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections (" + cols.length + "):", cols.map((c) => c.name).join(", "));
  await mongoose.disconnect();
  console.log("Disconnected cleanly.");
} catch (err) {
  clearTimeout(t);
  console.error("FAILED:", err.message);
  process.exit(3);
}