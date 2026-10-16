"use client";

import { useState } from "react";
import { CheckCircle2, CloudUpload, RefreshCw } from "lucide-react";
import { useStudio } from "./studio-context";

// Top bar of the SEO Studio: what is not live yet, and the Confirm & Publish button
export default function PublishBar() {
  const studio = useStudio();
  const { data, publishing } = studio;
  const [justPublished, setJustPublished] = useState(false);
  const [reloading, setReloading] = useState(false);

  if (!data) return null;

  const u = studio.unsaved();
  const unsavedCount = u.sections.length + u.seoPaths.length + (u.business ? 1 : 0);
  const hasChanges = unsavedCount > 0 || data.pendingPublish;

  const status = unsavedCount
    ? `${unsavedCount} unsaved ${unsavedCount === 1 ? "change" : "changes"}`
    : data.pendingPublish
      ? "Saved changes are not live yet"
      : justPublished
        ? "Published – the website shows the latest values"
        : "The website is up to date";

  const publish = async () => {
    if (!confirm("Publish all changes to the website? Visitors will see them straight away.")) return;
    setJustPublished(false);
    if (await studio.publish()) setJustPublished(true);
  };

  const reload = async () => {
    if (unsavedCount && !confirm("Discard unsaved changes and load the latest values from the database?")) return;
    setReloading(true);
    await studio.reload();
    setReloading(false);
  };

  return (
    <div
      className={`shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 py-2.5 border-b text-sm ${
        hasChanges ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-gray-200 text-gray-600"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {hasChanges ? (
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
        )}
        <span className="truncate">
          {status}
          {!hasChanges && data.publishedAt && (
            <span className="text-gray-400"> · last published {new Date(data.publishedAt).toLocaleString()}</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reload}
          disabled={reloading || publishing}
          title="Load the latest values from the database"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-black/5 disabled:opacity-50"
        >
          <RefreshCw size={14} className={reloading ? "animate-spin" : ""} /> Refresh
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={!hasChanges || publishing || data.missingTables}
          className="flex items-center gap-2 bg-navy hover:bg-navy/90 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-40"
        >
          <CloudUpload size={15} /> {publishing ? "Publishing…" : "Confirm & Publish"}
        </button>
      </div>
    </div>
  );
}
