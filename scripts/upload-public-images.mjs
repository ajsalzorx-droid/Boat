// Uploads every image of the site (public/images, catbo, race and the top of public/) to Cloudinary,
// keeping the same folders and file names:
//   public/images/custom/x.png  ->  https://res.cloudinary.com/<cloud>/image/upload/v…/images/custom/x.png
//
//   node --env-file=.env.local scripts/upload-public-images.mjs           -> upload
//   node --env-file=.env.local scripts/upload-public-images.mjs --dry-run -> only list the files
//
// backup/cloudinary-public.json records what is uploaded (local path -> Cloudinary URL), so a
// re-run only uploads new or missing files. Needs the Cloudinary keys in .env.local.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const dryRun = process.argv.includes("--dry-run");
const root = new URL("../", import.meta.url);
const publicDir = new URL("public/", root);
const mapFile = new URL("backup/cloudinary-public.json", root);
const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary free plan limit: the 60 MB+ 360 originals stay local (the site does not use them)
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
if (!dryRun && (!cloud_name || !api_key || !api_secret)) {
  console.error("Cloudinary keys are missing in .env.local (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
  process.exit(1);
}
cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

// Site paths of every image under public/images, e.g. "/images/custom/x.png"
async function listImages(dir = "images") {
  const out = [];
  for (const entry of await readdir(new URL(`${dir}/`, publicDir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await listImages(rel)));
    else if (IMAGE_EXT.test(entry.name)) {
      if ((await stat(new URL(rel, publicDir))).size > MAX_BYTES) console.log(`  skipped (over 10 MB): /${rel}`);
      else out.push(`/${rel}`);
    }
  }
  return out.sort();
}

const map = existsSync(mapFile) ? JSON.parse(await readFile(mapFile, "utf8")) : {};
// Site images at the top of public/ (icon.png stays local: browsers expect the tab icon on the site itself)
const ROOT_IMAGES = [
  "/logo.webp",
  "/MenuIcon-02.webp",
  "/MenuIcon-plate.webp",
  "/MenuIcon-fish.webp",
  "/images-removebg-preview.webp",
  "/fast-shipping.png",
  "/gjgf.png",
  "/images.png",
  "/menu-spoon.png",
  "/restaurant.png",
];
// Stock photos used as built-in defaults (src/lib/content.ts, src/data/menu.ts), copied from Pexels
// to images/pexels/<id>-<width>: the file name cdn("/images/pexels/...") asks for
const pexelsUrl = (id, w) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80&fm=webp`;
const SOUP_BOWL = "https://images.pexels.com/photos/20814983/pexels-photo-20814983/free-photo-of-steaming-seafood-bowl.jpeg?auto=compress&cs=tinysrgb&w=800&q=80&fm=webp";
const PEXELS = [
  ...["10368144", "11054363", "1267320", "1683545", "2098085", "262978", "331107", "1211887", "1126359", "4021983"].map((id) => [id, 800]),
  ...["11054363", "1267320", "331107"].map((id) => [id, 1260]),
  ["20814983", 800],
].map(([id, w]) => ({ path: `/images/pexels/${id}-${w}.webp`, url: id === "20814983" ? SOUP_BOWL : pexelsUrl(id, w) }));
const images = [...(await listImages()), ...(await listImages("catbo")), ...(await listImages("race")), ...PEXELS.map((p) => p.path), ...ROOT_IMAGES.filter((p) => existsSync(new URL(`.${p}`, publicDir)))];
// A PNG next to an SVG of the same name gets "-png" (Cloudinary names have no extension, so one would
// overwrite the other)
const publicId = (p) => {
  const id = p.slice(1).replace(IMAGE_EXT, "");
  return /.png$/i.test(p) && images.includes(p.replace(/.png$/i, ".svg")) ? `${id}-png` : id;
};
const todo = images.filter((p) => !map[p]);
console.log(`${images.length} site images, ${images.length - todo.length} already on Cloudinary, ${todo.length} to upload.`);
if (dryRun) {
  for (const p of todo) console.log("  " + p);
  process.exit(0);
}

await mkdir(new URL("backup/", root), { recursive: true });
let failed = 0;
for (const [i, sitePath] of todo.entries()) {
  try {
    const stock = PEXELS.find((p) => p.path === sitePath);
    const res = await cloudinary.uploader.upload(stock ? stock.url : fileURLToPath(new URL(`.${sitePath}`, publicDir)), {
      public_id: publicId(sitePath), // same folders and name as on the site
      overwrite: true,
      resource_type: "image",
      ...(stock && { format: "webp" }),
    });
    map[sitePath] = res.secure_url;
    await writeFile(mapFile, JSON.stringify(map, null, 2)); // saved after each file: safe to stop and re-run
    console.log(`  [${i + 1}/${todo.length}] ${sitePath} -> ${res.secure_url}`);
  } catch (e) {
    failed++;
    console.error(`  [${i + 1}/${todo.length}] FAILED ${sitePath}: ${e?.message ?? e?.error?.message ?? JSON.stringify(e)}`);
  }
}
console.log(`\nDone: ${Object.keys(map).length}/${images.length} images on Cloudinary${failed ? `, ${failed} failed (run again to retry)` : ""}.`);
if (failed) process.exitCode = 1;
