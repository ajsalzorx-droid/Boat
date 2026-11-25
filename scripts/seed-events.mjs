// Adds the first photo event ("Caught a Smile with Catbo", photos in public/images/events) to the
// database, so it shows on /events and can be edited in Admin -> Events.
//
//   node --env-file=.env.local scripts/seed-events.mjs
//
// Safe to re-run: an event already at that address is left exactly as it is.
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing in .env.local");
  process.exit(1);
}

const FOLDER = "/images/events/caught-a-smile-with-catbo";
const ALTS = [
  "Smiling young guest with a Catbo key ring under the lights at Boat Seafood Dubai",
  "Young guest showing a Catbo cat key ring at Boat Seafood, Waterfront Market",
  "Young guest looking at a Catbo key ring at a table at Boat Seafood Dubai",
  "Three friends holding Catbo key rings outside Boat Seafood restaurant in Dubai",
  "Young guest holding up a Catbo key ring on the Boat Seafood terrace",
  "Two young guests holding up their Catbo key rings at Boat Seafood Dubai",
  "Laughing young guest with a Catbo key ring at a Boat Seafood table",
  "Two young guests with Catbo key rings inside Boat Seafood restaurant",
  "Two little guests on the Boat Seafood terrace in the evening",
  "Young guest holding a Catbo key ring at a table at Boat Seafood, Dubai",
];

const event = {
  slug: "caught-a-smile-with-catbo",
  title: "Caught a Smile with Catbo",
  tag: "Little guests",
  event_date: "",
  description: "Our little guests met Catbo, the ship's cat of Boat Seafood Dubai, as a key ring. See the smiles we caught at Waterfront Market.",
  body: [
    "At Boat, the best catch of the day is sometimes a smile. Our young guests met Catbo, the ship's cat, this time as a little blue key ring with a fish under his arm.",
    "They held him up at the table, on the terrace and by our door, and we took a photo of each moment.",
    "Thank you to every family who shared a smile with us at Waterfront Market, Deira. Come by the next time you are near the water and say hello to Catbo.",
  ].join("\n\n"),
  seo_title: "",
  cover_image: `${FOLDER}/caught-a-smile-with-catbo-cover.webp`,
  cover_alt: "Caught a Smile with Catbo: the blue Catbo cat key ring of Boat Seafood Dubai",
  photos: ALTS.map((alt, i) => ({ src: `${FOLDER}/catbo-key-ring-smile-boat-seafood-dubai-${String(i + 1).padStart(2, "0")}.webp`, alt })),
  is_active: true,
  old_slugs: [],
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const events = client.db(process.env.MONGODB_DB || "boat").collection("events");
  await events.createIndex({ slug: 1 }, { unique: true });
  const now = new Date();
  const res = await events.updateOne(
    { $or: [{ slug: event.slug }, { old_slugs: event.slug }] },
    { $setOnInsert: { _id: randomUUID(), ...event, created_at: now, updated_at: now } },
    { upsert: true }
  );
  console.log(res.upsertedCount ? `Added "${event.title}" with ${event.photos.length} photos.` : `"${event.title}" is already there; left as it is.`);
} finally {
  await client.close();
}
