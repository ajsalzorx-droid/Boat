// Uploads every file in public/images (and the site images at the top of public/) to Cloudinary,
// keeping the same folders and file names:
//   public/images/custom/x.png  ->  https://res.cloudinary.com/<cloud>/image/upload/v…/images/custom/x.png
//
//   node --env-file=.env.local scripts/upload-public-images.mjs           -> upload
//   node --env-file=.env.local scripts/upload-public-images.mjs --dry-run -> only list the files
//
// backup/cloudinary-public.json records what is uploaded (local path -> Cloudinary URL), so a
// re-run only uploads new or missing files. Needs the Cloudinary keys in .env.local.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const dryRun = process.argv.includes("--dry-run");
const root = new URL("../", import.meta.url);
const publicDir = new URL("public/", root);
const mapFile = new URL("backup/cloudinary-public.json", root);
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
    else if (IMAGE_EXT.test(entry.name)) out.push(`/${rel}`);
  }
  return out.sort();
}

const map = existsSync(mapFile) ? JSON.parse(await readFile(mapFile, "utf8")) : {};
// Site images at the top of public/ (icon.png stays local: browsers expect the tab icon on the site itself)
const ROOT_IMAGES = ["/logo.webp", "/MenuIcon-02.webp", "/images-removebg-preview.webp"];
const images = [...(await listImages()), ...ROOT_IMAGES.filter((p) => existsSync(new URL(`.${p}`, publicDir)))];
const todo = images.filter((p) => !map[p]);
console.log(`${images.length} images in public/images, ${images.length - todo.length} already on Cloudinary, ${todo.length} to upload.`);
if (dryRun) {
  for (const p of todo) console.log("  " + p);
  process.exit(0);
}

await mkdir(new URL("backup/", root), { recursive: true });
let failed = 0;
for (const [i, sitePath] of todo.entries()) {
  try {
    const res = await cloudinary.uploader.upload(fileURLToPath(new URL(`.${sitePath}`, publicDir)), {
      public_id: sitePath.slice(1).replace(IMAGE_EXT, ""), // same folders and name as on the site
      overwrite: true,
      resource_type: "image",
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
