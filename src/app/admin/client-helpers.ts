import { createImageUpload, type ActionResult, type UploadFolder } from "./actions";
import { toast } from "./Toaster";

// Upload size limits per folder: offer banners are full-screen artwork from the designers, so they
// get more room (Cloudinary's free plan accepts images up to 10 MB). Stored as WebP either way.
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_MB_BY_FOLDER: Partial<Record<UploadFolder, number>> = { offers: 10 };

// SweetAlert2 dialogs in the site colours. The library is loaded on first use, so admin pages
// that never ask don't download it. Line breaks in the text are kept.
async function swal() {
  return (await import("sweetalert2")).default;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const textHtml = (text?: string) => (text ? escapeHtml(text).replace(/\n/g, "<br>") : undefined);

// Yes/Cancel question. Resolves true only when the confirm button is clicked.
// danger: red button, warning icon, Cancel focused (so Enter doesn't delete by accident)
export async function confirmDialog({
  title,
  text,
  confirmText = "Yes",
  cancelText = "Cancel",
  danger = false,
}: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const Swal = await swal();
  const result = await Swal.fire({
    title,
    html: textHtml(text),
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? "#dc2626" : "#003049",
    cancelButtonColor: "#9ca3af",
    reverseButtons: true,
    focusCancel: danger,
  });
  return result.isConfirmed;
}

// A message that has to be read before going on (one OK button)
export async function messageDialog({
  title,
  text,
  icon = "info",
}: {
  title: string;
  text?: string;
  icon?: "info" | "warning" | "error" | "success";
}): Promise<void> {
  const Swal = await swal();
  await Swal.fire({ title, html: textHtml(text), icon, confirmButtonText: "OK", confirmButtonColor: "#003049" });
}

// Shows the error from an admin action (as a toast). Returns true if the action failed.
// 401 = token missing/expired -> back to login (after a moment, so the message can be read).
export function actionFailed(res: ActionResult<unknown>): boolean {
  if (res.ok) return false;
  toast(res.error, "error");
  if (res.status === 401) {
    const next = encodeURIComponent(window.location.pathname);
    setTimeout(() => window.location.assign(`/admin/login?next=${next}`), 1200);
  }
  return true;
}

// Server verifies the login and signs a one-time upload; the file goes straight to Cloudinary.
// Returns the Cloudinary URL, which is what gets saved in the database.
export async function uploadAdminImage(folder: UploadFolder, file: File): Promise<string | null> {
  const maxMb = MAX_IMAGE_MB_BY_FOLDER[folder] ?? MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) {
    toast(`Image is too large (max ${maxMb} MB).`, "error");
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
    toast(`Upload failed: ${e instanceof Error ? e.message : "please try again."}`, "error");
    return null;
  }
}
