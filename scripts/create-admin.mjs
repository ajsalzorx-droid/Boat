// Creates a staff login (or sets a new password for an existing one).
//
//   node --env-file=.env.local scripts/create-admin.mjs you@example.com          -> admin (products, orders)
//   node --env-file=.env.local scripts/create-admin.mjs seo@agency.com seo      -> SEO Studio only
//
// Asks for the password (hidden while typing). Only a scrypt hash is stored, in the same
// format as src/lib/session.ts.
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { MongoClient } from "mongodb";

const scrypt = promisify(scryptCb);
const [, , rawEmail, role = "admin"] = process.argv;
const email = String(rawEmail ?? "").trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["admin", "seo"].includes(role)) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [admin|seo]");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Reads a line without echoing it
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await askHidden("Password (min 10 characters): ");
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}
if ((await askHidden("Repeat password: ")) !== password) {
  console.error("Passwords don't match.");
  process.exit(1);
}

const N = 16384, R = 8, P = 1;
const salt = randomBytes(16);
const hash = await scrypt(password, salt, 64, { N, r: R, p: P });
const password_hash = ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");

const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const users = client.db(process.env.MONGODB_DB || "boat").collection("admin_users");
  const res = await users.updateOne(
    { email },
    { $set: { password_hash, role }, $setOnInsert: { email, name: null, created_at: new Date() } },
    { upsert: true }
  );
  // A new password or role ends every existing session of this account
  const ended = await client.db(process.env.MONGODB_DB || "boat").collection("sessions").deleteMany({ email });
  console.log(res.upsertedCount ? `Created ${role} login for ${email}` : `Updated ${email} (role: ${role}, new password)`);
  if (ended.deletedCount) console.log(`Logged out ${ended.deletedCount} existing session(s)`);
} finally {
  await client.close();
}
