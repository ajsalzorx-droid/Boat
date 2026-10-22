// Moves every image the database points to onto Cloudinary as WebP and saves the Cloudinary URL in
// its place. Cloudinary images that are not WebP yet are converted (same name, now .webp).
//
//   node --env-file=.env.local scripts/images-to-cloudinary.mjs           -> upload and update
//   node --env-file=.env.local scripts/images-to-cloudinary.mjs --dry-run -> only list what would change
//
// Covers menu_items.image_url, daily_catch.image_url, seo_pages.og_image,
// business_info.default_og_image and image fields saved in site_content. Local paths ("/images/…")
// reuse the uploads of scripts/upload-public-images.mjs (same path on Cloudinary, run it first) or
// are uploaded from public/; web addresses (e.g. Pexels) are fetched by Cloudinary. Each image is
// uploaded once; backup/cloudinary-map.json remembers old -> new URLs, so re-running is safe and
// only does what is left. Images already on Cloudinary are skipped. Needs the Cloudinary keys and
// MONGODB_URI in .env.local.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { MongoClient } from "mongodb";

const dryRun = process.argv.includes("--dry-run");
const root = new URL("../", import.meta.url);
const mapFile = new URL("backup/cloudinary-map.json", root);
const publicMapFile = new URL("backup/cloudinary-public.json", root);
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in .env.local");
if (!dryRun && (!cloud_name || !api_key || !api_secret)) {
  console.error("Cloudinary keys are missing in .env.local (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
  process.exit(1);
}
cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
const onCloudinary = (url) => url.startsWith("https://res.cloudinary.com/");
const isWebp = (url) => /\.webp$/i.test(url.split("?")[0]);

// Cloudinary public id from a delivery URL: .../image/upload/v123/boat/menu/abc.jpg -> boat/menu/abc
const publicIdOf = (url) =>
  url
    .split("?")[0]
    .replace(/^.*\/image\/upload\/(?:v\d+\/)?/, "")
    .replace(/\.[a-z0-9]+$/i, "");

// Is this string an image the site shows that is not yet a WebP on Cloudinary?
function needsMove(value) {
  if (typeof value !== "string" || !value) return false;
  if (onCloudinary(value)) return !isWebp(value);
  const clean = value.split("?")[0];
  // Local image (or one converted to WebP since: the .png/.jpg moved to backup/original-images)
  if (value.startsWith("/"))
    return IMAGE_EXT.test(clean) && [clean, clean.replace(IMAGE_EXT, ".webp")].some((p) => existsSync(new URL(`public${p}`, root)));
  return value.startsWith("https://") && (IMAGE_EXT.test(clean) || /pexels\.com\/photos\//.test(value));
}

const map = existsSync(mapFile) ? JSON.parse(await readFile(mapFile, "utf8")) : {};
const publicMap = existsSync(publicMapFile) ? JSON.parse(await readFile(publicMapFile, "utf8")) : {};

async function moveImage(url, folder) {
  const clean = url.split("?")[0];
  if (map[url] && isWebp(map[url])) return map[url];
  // Local image whose WebP version is already uploaded by upload-public-images.mjs
  const webpPath = clean.replace(IMAGE_EXT, ".webp");
  if (url.startsWith("/") && publicMap[webpPath]) return (map[url] = publicMap[webpPath]);
  if (url.startsWith("/") && isWebp(clean) && publicMap[clean]) return (map[url] = publicMap[clean]);
  if (dryRun) return `(Cloudinary WebP) ${url}`;
  let res;
  if (onCloudinary(url)) {
    // Already on Cloudinary: same name; reuse the WebP of the site image, or convert this one
    const id = publicIdOf(url);
    const localWebp = new URL(`public/${id}.webp`, root);
    res = existsSync(localWebp)
      ? await cloudinary.uploader.upload(fileURLToPath(localWebp), { public_id: id, overwrite: true, invalidate: true })
      : await cloudinary.uploader.upload(url, { public_id: id, overwrite: true, invalidate: true, format: "webp" });
  } else if (url.startsWith("/")) {
    // Local file: keeps its site path on Cloudinary (images/...), stored as WebP
    res = await cloudinary.uploader.upload(fileURLToPath(new URL(`public${clean}`, root)), { public_id: clean.slice(1).replace(IMAGE_EXT, ""), overwrite: true, format: "webp" });
  } else {
    res = await cloudinary.uploader.upload(url, { folder: `boat/${folder}`, format: "webp" });
  }
  map[url] = res.secure_url;
  await mkdir(new URL("backup/", root), { recursive: true });
  await writeFile(mapFile, JSON.stringify(map, null, 2)); // saved after each upload: safe to stop and re-run
  console.log(`  uploaded ${url}\n        -> ${res.secure_url}`);
  return res.secure_url;
}

// Replaces image strings anywhere inside a value (for site_content's nested fields and lists)
async function replaceDeep(value, folder) {
  if (needsMove(value)) return moveImage(value, folder);
  if (Array.isArray(value)) return Promise.all(value.map((v) => replaceDeep(v, folder)));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await replaceDeep(v, folder);
    return out;
  }
  return value;
}

const client = new MongoClient(process.env.MONGODB_URI);
let changed = 0;
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "boat");

  const simple = [
    ["menu_items", "image_url", "menu"],
    ["daily_catch", "image_url", "daily-catch"],
    ["seo_pages", "og_image", "seo"],
    ["business_info", "default_og_image", "seo"],
  ];
  for (const [collection, field, folder] of simple) {
    console.log(`${collection}.${field}:`);
    for (const doc of await db.collection(collection).find({ [field]: { $type: "string", $ne: "" } }).toArray()) {
      if (!needsMove(doc[field])) continue;
      const url = await moveImage(doc[field], folder);
      if (!dryRun) await db.collection(collection).updateOne({ _id: doc._id }, { $set: { [field]: url } });
      else console.log(`  ${doc._id}: ${doc[field]}`);
      changed++;
    }
  }

  console.log("site_content (images in page text):");
  for (const doc of await db.collection("site_content").find().toArray()) {
    const data = await replaceDeep(doc.data, "content");
    if (JSON.stringify(data) === JSON.stringify(doc.data)) continue;
    if (!dryRun) await db.collection("site_content").updateOne({ _id: doc._id }, { $set: { data } });
    console.log(`  section ${doc._id} updated`);
    changed++;
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"} ${changed} record(s). ${Object.keys(map).length} image(s) mapped to Cloudinary.`);
} finally {
  await client.close();
}
