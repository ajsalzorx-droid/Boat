import { createImageUpload, type ActionResult, type UploadFolder } from "./actions";

const MAX_IMAGE_MB = 5;

// Shows the error from an admin action. Returns true if the action failed.
// 401 = token missing/expired -> back to login.
export function actionFailed(res: ActionResult<unknown>): boolean {
  if (res.ok) return false;
  alert(res.error);
  if (res.status === 401) {
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  return true;
}

// Server verifies the login and signs a one-time upload; the file goes straight to Cloudinary.
// Returns the Cloudinary URL, which is what gets saved in the database.
export async function uploadAdminImage(folder: UploadFolder, file: File): Promise<string | null> {
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    alert(`Image is too large (max ${MAX_IMAGE_MB} MB).`);
    return null;
  }

  const res = await createImageUpload(folder, file.name);
  if (actionFailed(res) || !res.ok || !res.data) return null;

  // Every signed value must be sent unchanged; Cloudinary stores the image as WebP
  const { uploadUrl, apiKey, timestamp, signature, folder: cloudFolder, publicId, format, transformation } = res.data;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", cloudFolder);
  form.append("public_id", publicId);
  form.append("format", format);
  form.append("transformation", transformation);

  try {
    const upload = await fetch(uploadUrl, { method: "POST", body: form });
    const body = await upload.json();
    if (!upload.ok || !body.secure_url) throw new Error(body?.error?.message ?? `Cloudinary error ${upload.status}`);
    return body.secure_url as string;
  } catch (e) {
    alert(`Upload failed: ${e instanceof Error ? e.message : "please try again."}`);
    return null;
  }
}
