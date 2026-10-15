import { supabase } from "@/lib/supabase";
import { createImageUploadUrl, type ActionResult } from "./actions";

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

// Server verifies the token and returns a one-time upload URL; the file goes straight to Storage.
export async function uploadAdminImage(folder: "menu" | "daily-catch", file: File): Promise<string | null> {
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    alert(`Image is too large (max ${MAX_IMAGE_MB} MB).`);
    return null;
  }

  const res = await createImageUploadUrl(folder, file.name);
  if (actionFailed(res) || !res.ok || !res.data) return null;

  const { path, token, publicUrl } = res.data;
  const { error } = await supabase.storage.from("images").uploadToSignedUrl(path, token, file);
  if (error) {
    alert(error.message);
    return null;
  }
  return publicUrl;
}
