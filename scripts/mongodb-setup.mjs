// Sets up the MongoDB database for the site and loads the data saved from the old Supabase project.
//
//   node --env-file=.env.local scripts/mongodb-setup.mjs
//
// 1. Reads the Supabase export in backup/supabase/*.json (menu_items, daily_catch, orders). If the
//    old Supabase keys are still set, it fetches a fresh copy first (previous copy kept as *.prev.json).
// 2. Creates the collections with schemas (MongoDB rejects documents that don't match) and indexes.
// 3. Adds rows that are missing, keeping each Supabase id as _id; dates become real dates.
//    Rows already in MongoDB are left exactly as they are (never overwritten).
// 4. Adds the SEO starting values (page titles, business info, publish state) only where missing,
//    so values saved later in the SEO Studio are never overwritten.
// 5. Checks every collection's count against the backup.
//
// Safe to re-run: nothing is overwritten, deleted or duplicated.
// Needs MONGODB_URI (and optionally MONGODB_DB, default "boat") in .env.local.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { MongoClient } from "mongodb";

const root = new URL("../", import.meta.url);
const backupDir = new URL("backup/supabase/", root);

// ---------- Schemas ----------
const str = { bsonType: "string" };
const optStr = { bsonType: ["string", "null"] };
const bool = { bsonType: "bool" };
const optBool = { bsonType: ["bool", "null"] };
const money = { bsonType: ["double", "int", "long", "decimal"], minimum: 0 };
const date = { bsonType: "date" };
const optDate = { bsonType: ["date", "null"] };

const SCHEMAS = {
  // Dishes on the menu (Admin -> Menu)
  menu_items: {
    required: ["_id", "name", "price", "category", "is_active"],
    properties: {
      _id: str,
      name: str,
      description: optStr,
      price: money,
      category: str,
      tag: optStr,
      image_url: optStr,
      dietary: { bsonType: ["array", "null"], items: str },
      is_tall: optBool,
      is_wide: optBool,
      is_active: bool,
      created_at: date,
    },
  },
  // Today's fresh fish (Admin -> Daily Catch)
  daily_catch: {
    required: ["_id", "name", "price", "is_available"],
    properties: {
      _id: str,
      name: str,
      origin: optStr,
      description: optStr,
      price: money,
      image_url: optStr,
      is_available: bool,
      updated_at: date,
    },
  },
  // % off the whole menu, some categories or chosen dishes (Admin -> Offers)
  offers: {
    required: ["_id", "title", "percent", "scope", "is_active"],
    properties: {
      _id: str,
      title: str,
      description: optStr,
      percent: { bsonType: ["int", "long", "double"], minimum: 1, maximum: 90 },
      image_url: optStr,
      scope: { enum: ["all", "categories", "items"] },
      categories: { bsonType: "array", items: str },
      item_ids: { bsonType: "array", items: str },
      starts_at: optDate, // null = from now
      ends_at: optDate, // null = until switched off
      is_active: bool,
      banner_url: optStr, // homepage banner, wide ("" = none)
      banner_mobile_url: optStr, // homepage banner for phones ("" = the wide one)
      created_at: date,
      updated_at: date,
    },
  },
  // Online bookings from /book: table reservations and fish-preparation requests (Admin -> Bookings)
  bookings: {
    required: ["_id", "type", "name", "phone", "date", "time", "guests", "status", "created_at"],
    properties: {
      _id: str,
      type: { enum: ["table", "fish"] },
      name: str,
      phone: str,
      email: optStr,
      date: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, // Dubai date
      time: { bsonType: "string", pattern: "^\\d{2}:\\d{2}$" }, // Dubai time
      guests: { bsonType: ["int", "long", "double"], minimum: 1, maximum: 30 },
      fish_type: optStr, // fish preparation only
      fish_weight: { bsonType: ["double", "int", "long", "null"] }, // kg
      style: optStr, // how to cook it
      notes: optStr,
      // Dishes pre-ordered from the menu (price = one portion with any offer), null = none
      items: {
        bsonType: ["array", "null"],
        items: {
          bsonType: "object",
          required: ["name", "quantity", "price"],
          properties: { name: str, quantity: { bsonType: ["int", "long", "double"], minimum: 1 }, price: money },
        },
      },
      items_total: { bsonType: ["double", "int", "long", "decimal", "null"], minimum: 0 },
      status: { enum: ["new", "confirmed", "cancelled"] },
      created_at: date,
      updated_at: optDate,
    },
  },
  // Orders from the website, shown on the Admin and Kitchen screens
  orders: {
    required: ["_id", "table", "items", "total", "status", "timestamp"],
    properties: {
      _id: str,
      table: str,
      items: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["name", "quantity"],
          properties: { name: str, quantity: { bsonType: ["int", "long", "double"], minimum: 1 } },
        },
      },
      total: money,
      status: { enum: ["pending", "completed"] },
      timestamp: date,
    },
  },
  // SEO Studio: title / description / share image per page (_id = page path, e.g. "/menu")
  seo_pages: {
    required: ["_id", "title", "description", "og_image", "noindex", "updated_at"],
    properties: {
      _id: str,
      title: str,
      description: str,
      og_image: str, // share image (WhatsApp, Facebook, X)
      noindex: bool, // true = hide the page from Google
      updated_at: date,
    },
  },
  // SEO Studio: business details for Google's restaurant info (one document, _id = 1)
  business_info: {
    required: ["_id", "name"],
    properties: {
      _id: { enum: [1] },
      ...Object.fromEntries(
        [
          "name", "site_url", "phone", "email", "street", "locality", "region", "postal_code", "country",
          "latitude", "longitude", "opens", "closes", "price_range", "cuisine", "instagram", "facebook",
          "tiktok", "default_og_image",
        ].map((k) => [k, str])
      ),
      updated_at: date,
    },
  },
  // SEO Studio: page text, images and lists, one document per section (_id = section, e.g. "hero")
  site_content: {
    required: ["_id", "data", "updated_at"],
    properties: {
      _id: str,
      data: {
        bsonType: "object",
        properties: { fields: { bsonType: "object" }, items: { bsonType: "array" } },
      },
      updated_at: date,
    },
  },
  // SEO Studio publish state (one document, _id = 1): changed_at > published_at = unpublished edits
  site_publish: {
    required: ["_id"],
    properties: { _id: { enum: [1] }, changed_at: optDate, published_at: optDate },
  },
  // Logins for /admin, /kitchen and /seo (replaces Supabase Auth; passwords stored only as hashes)
  admin_users: {
    required: ["email", "password_hash", "role", "created_at"],
    properties: {
      email: str,
      name: optStr,
      password_hash: str,
      role: { enum: ["admin", "seo"] }, // admin = products and orders; seo = SEO Studio only
      created_at: date,
      last_login_at: optDate,
    },
  },
  // Staff login sessions (src/lib/session.ts). _id = SHA-256 of the session id in the cookie;
  // MongoDB deletes each session when it expires (TTL index on expires_at).
  sessions: {
    required: ["_id", "email", "role", "created_at", "expires_at", "last_seen_at"],
    properties: {
      _id: { bsonType: "string", pattern: "^[0-9a-f]{64}$" },
      email: str,
      role: { enum: ["admin", "seo"] },
      created_at: date,
      expires_at: date,
      last_seen_at: date,
      ip: optStr,
      user_agent: optStr,
    },
  },
};

const INDEXES = {
  menu_items: [{ key: { category: 1, is_active: 1 } }, { key: { name: 1 } }],
  daily_catch: [{ key: { is_available: 1 } }],
  offers: [{ key: { is_active: 1 } }],
  bookings: [{ key: { date: 1, time: 1 } }, { key: { type: 1, status: 1 } }],
  orders: [{ key: { status: 1, timestamp: -1 } }, { key: { timestamp: -1 } }],
  admin_users: [{ key: { email: 1 }, unique: true }],
  sessions: [{ key: { expires_at: 1 }, expireAfterSeconds: 0 }, { key: { email: 1 } }],
};

// Supabase columns that hold dates
const DATE_FIELDS = { menu_items: ["created_at"], daily_catch: ["updated_at"], orders: ["timestamp"] };

// ---------- SEO starting values (same as src/lib/seo.ts) ----------
async function seoPageDefaults() {
  const source = await readFile(new URL("src/lib/seo.ts", root), "utf8");
  const block = source.slice(source.indexOf("export const SEO_PAGES"), source.indexOf("] as const"));
  const pages = [...block.matchAll(/path: '([^']+)'[\s\S]*?title: '([^']+)'[\s\S]*?description:\s*'([^']+)'/g)];
  return pages.map(([, path, title, description]) => ({ path, title, description }));
}

const BUSINESS_DEFAULTS = {
  name: "Boat Seafood Restaurant",
  site_url: "https://boatseafood.com",
  phone: "+971 4 324 7998",
  email: "boatdxb26@gmail.com",
  street: "Waterfront Market, Al Khaleej Rd",
  locality: "Deira",
  region: "Dubai",
  postal_code: "",
  country: "AE",
  latitude: "25.2759",
  longitude: "55.3202",
  opens: "12:00",
  closes: "23:00",
  price_range: "$$",
  cuisine: "Seafood",
  instagram: "https://www.instagram.com/boat_seafood_/",
  facebook: "https://www.facebook.com/boatseafoodrestaurant/",
  tiktok: "https://www.tiktok.com/@boatseafoodrestaurant",
  default_og_image: "",
};

// ---------- 1. Fetch from Supabase ----------
async function fetchFromSupabase(table) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing");
  const rows = [];
  // Page through in case a table grows past one response
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function freshBackup(table) {
  const file = new URL(`${table}.json`, backupDir);
  // Supabase is no longer used by the site: without its keys, load the saved export
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return JSON.parse(await readFile(file, "utf8"));
  }
  const rows = await fetchFromSupabase(table);
  if (existsSync(file)) {
    const previous = JSON.parse(await readFile(file, "utf8"));
    // Never replace a backup with fewer rows (e.g. a key that suddenly sees less)
    if (rows.length < previous.length) {
      console.warn(`  ${table}: Supabase returned ${rows.length} rows, backup has ${previous.length}; keeping the backup`);
      return previous;
    }
    await copyFile(file, new URL(`${table}.prev.json`, backupDir));
  }
  await writeFile(file, JSON.stringify(rows, null, 2));
  return rows;
}

// ---------- 2-5 ----------
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing in .env.local");
  process.exit(1);
}

await mkdir(backupDir, { recursive: true });
const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "boat");
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  console.log("Collections and schemas:");
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const validator = { $jsonSchema: { bsonType: "object", ...schema } };
    if (existing.has(name)) await db.command({ collMod: name, validator, validationLevel: "strict", validationAction: "error" });
    else await db.createCollection(name, { validator, validationLevel: "strict", validationAction: "error" });
    for (const index of INDEXES[name] ?? []) await db.collection(name).createIndex(index.key, { unique: !!index.unique, ...(index.expireAfterSeconds !== undefined && { expireAfterSeconds: index.expireAfterSeconds }) });
    console.log(`  ${name} ${existing.has(name) ? "(schema updated)" : "(created)"}`);
  }

  console.log("Data:");
  const expected = {};
  for (const table of Object.keys(DATE_FIELDS)) {
    const rows = await freshBackup(table);
    expected[table] = rows.length;
    if (rows.length) {
      await db.collection(table).bulkWrite(
        rows.map(({ id, ...row }) => {
          for (const field of DATE_FIELDS[table]) if (row[field]) row[field] = new Date(row[field]);
          // Only adds rows that are missing: data changed since (in the admin) is never overwritten
          return { updateOne: { filter: { _id: id }, update: { $setOnInsert: row }, upsert: true } };
        }),
        { ordered: true }
      );
    }
  }

  // SEO starting values: $setOnInsert only fills documents that don't exist yet
  const now = new Date();
  const pages = await seoPageDefaults();
  await db.collection("seo_pages").bulkWrite(
    pages.map((p) => ({
      updateOne: {
        filter: { _id: p.path },
        update: { $setOnInsert: { title: p.title, description: p.description, og_image: "", noindex: false, updated_at: now } },
        upsert: true,
      },
    }))
  );
  await db.collection("business_info").updateOne({ _id: 1 }, { $setOnInsert: { ...BUSINESS_DEFAULTS, updated_at: now } }, { upsert: true });
  await db.collection("site_publish").updateOne({ _id: 1 }, { $setOnInsert: { changed_at: null, published_at: null } }, { upsert: true });

  console.log("Check:");
  let ok = true;
  for (const [table, count] of Object.entries(expected)) {
    const inDb = await db.collection(table).countDocuments();
    if (inDb < count) ok = false;
    console.log(`  ${table}: ${count} in backup, ${inDb} in MongoDB ${inDb >= count ? "✓" : "MISSING ROWS"}`);
  }
  console.log(`  seo_pages: ${await db.collection("seo_pages").countDocuments()} pages (${pages.length} defaults)`);
  for (const name of ["business_info", "site_publish", "site_content", "admin_users"])
    console.log(`  ${name}: ${await db.collection(name).countDocuments()}`);
  if (!ok) process.exitCode = 1;
} finally {
  await client.close();
}
