"use client";

import { Upload, X, Check, Globe, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { ListFieldDef, SectionDef } from "@/lib/content";
import { lengthStatus } from "./use-studio-data";

export const inputClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:border-ocean focus:ring-1 focus:ring-ocean/30";

export function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <>
      <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{children}</span>
      {hint && <span className="block text-xs text-gray-400 mb-1.5">{hint}</span>}
    </>
  );
}

export function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const status = lengthStatus(value, { min, max });
  const color = { empty: "text-red-500", long: "text-red-500", short: "text-amber-500", good: "text-green-600" }[status];
  const note = {
    empty: "Empty – the default text is used",
    long: "Too long – Google will cut it off",
    short: "A bit short",
    good: "Good length",
  }[status];
  return (
    <div className={`flex justify-between text-xs mt-1.5 ${color}`}>
      <span>{note}</span>
      <span className="font-mono">
        {value.trim().length} / {max}
      </span>
    </div>
  );
}

// Alt text quality for the Images page and inline alt fields
export function AltStatus({ value, fallback }: { value: string; fallback?: string }) {
  const n = value.trim().length;
  if (n === 0 && fallback) return <span className="text-xs text-amber-500">Empty – uses &ldquo;{fallback}&rdquo;</span>;
  if (n === 0) return <span className="text-xs text-red-500">Missing alt text</span>;
  if (n < 10) return <span className="text-xs text-amber-500">Very short – describe the photo</span>;
  if (n > 125) return <span className="text-xs text-amber-500">Long – keep it under 125 characters</span>;
  return <span className="text-xs text-green-600">Good</span>;
}

export function Thumb({ src, className = "w-28 h-20" }: { src: string; className?: string }) {
  return (
    <span className={`${className} rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 block`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-contain bg-gray-800/5" />
      )}
    </span>
  );
}

export function UploadButton({
  uploading,
  hasValue,
  onFile,
}: {
  uploading: boolean;
  hasValue: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
      <Upload size={14} /> {uploading ? "Uploading…" : hasValue ? "Replace photo" : "Upload photo"}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

// One content field. `context` gives an alt field the image it describes.
export function FieldInput({
  field,
  value,
  imageSrc,
  uploading,
  onChange,
  onUpload,
}: {
  field: ListFieldDef;
  value: string;
  imageSrc?: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  if (field.type === "image") {
    return (
      <div>
        <Label hint={field.hint}>{field.label}</Label>
        <div className="flex items-center gap-4">
          <Thumb src={value} />
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <span>
              <UploadButton uploading={uploading} hasValue={!!value} onFile={onUpload} />
            </span>
            <span className="text-[11px] text-gray-400 truncate">{value}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <Label hint={field.hint}>{field.label}</Label>
      {field.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${inputClass} resize-y`} />
      ) : field.type === "alt" ? (
        <span className="flex items-start gap-3">
          {(field.src || imageSrc) && <Thumb src={field.src || imageSrc || ""} className="w-14 h-10" />}
          <span className="flex-1 min-w-0">
            <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
            <span className="block mt-1">
              <AltStatus value={value} />
            </span>
          </span>
        </span>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </label>
  );
}

export function ListEditor({
  def,
  items,
  uploadingKey,
  onChange,
  onUpload,
}: {
  def: SectionDef;
  items: Record<string, string>[];
  uploadingKey: string | null;
  onChange: (items: Record<string, string>[]) => void;
  onUpload: (key: string, file: File, apply: (url: string) => void) => void;
}) {
  const list = def.list!;
  const setItem = (i: number, key: string, value: string) =>
    onChange(items.map((item, j) => (j === i ? { ...item, [key]: value } : item)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
        {list.label}{" "}
        <span className="text-gray-400 font-normal normal-case tracking-normal">
          ({items.length} of max {list.max})
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/60">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-sm font-semibold text-navy truncate">
                {list.itemLabel} {i + 1}
                {item.title || item.name || item.label || item.text ? (
                  <span className="text-gray-400 font-normal"> · {item.title || item.name || item.label || item.text}</span>
                ) : null}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton
                  label="Remove"
                  danger
                  onClick={() => {
                    if (confirm(`Remove ${list.itemLabel.toLowerCase()} ${i + 1}?`)) onChange(items.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.fields.map((f) => (
                <div key={f.key} className={f.type === "text" || f.type === "link" ? "" : "md:col-span-2"}>
                  <FieldInput
                    field={f}
                    value={item[f.key] ?? ""}
                    imageSrc={f.image ? item[f.image] : undefined}
                    uploading={uploadingKey === `${def.id}.${i}.${f.key}`}
                    onChange={(v) => setItem(i, f.key, v)}
                    onUpload={(file) => onUpload(`${def.id}.${i}.${f.key}`, file, (url) => setItem(i, f.key, url))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {items.length < list.max && (
        <button
          type="button"
          onClick={() => onChange([...items, Object.fromEntries(list.fields.map((f) => [f.key, ""]))])}
          className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ocean hover:text-navy"
        >
          <Plus size={14} /> Add {list.itemLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded text-gray-400 disabled:opacity-30 ${
        danger ? "hover:text-red-500 hover:bg-red-50" : "hover:text-navy hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export function SaveButton({
  saving,
  saved,
  dirty = true,
  label = "Save",
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  dirty?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || (!dirty && !saved)}
      className="flex items-center justify-center gap-2 bg-navy hover:bg-navy/90 text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-40"
    >
      {saved && !dirty && <Check size={16} />}
      {saving ? "Saving…" : saved && !dirty ? "Saved – publish to go live" : label}
    </button>
  );
}

export function ShareImageInput({
  value,
  fallback,
  uploading,
  onFile,
  onClear,
}: {
  value: string;
  fallback?: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-32 aspect-[1.91/1] rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 block">
        {(value || fallback) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value || fallback} alt="" className={`w-full h-full object-cover ${value ? "" : "opacity-40"}`} />
        )}
      </span>
      <div className="flex flex-col gap-2 items-start">
        <UploadButton uploading={uploading} hasValue={!!value} onFile={onFile} />
        {value ? (
          <button type="button" onClick={onClear} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X size={12} /> Remove
          </button>
        ) : (
          fallback && <span className="text-xs text-gray-400">Using the default image</span>
        )}
      </div>
    </div>
  );
}

export function GooglePreview({
  siteName,
  origin,
  path,
  title,
  description,
}: {
  siteName: string;
  origin: string;
  path: string;
  title: string;
  description: string;
}) {
  return (
    <div className="font-sans">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Globe size={14} className="text-gray-500" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm text-[#202124] truncate">{siteName}</div>
          <div className="text-xs text-[#4d5156] truncate">
            {origin}
            {path === "/" ? "" : path.replace("/", " › ")}
          </div>
        </div>
      </div>
      <div className="text-[20px] leading-snug text-[#1a0dab]">{truncate(title, 60)}</div>
      <div className="text-sm text-[#4d5156] leading-relaxed">{truncate(description, 160)}</div>
    </div>
  );
}

export function SharePreview({ origin, image, title, description }: { origin: string; image: string; title: string; description: string }) {
  return (
    <div className="max-w-sm rounded-lg overflow-hidden border border-gray-200 bg-[#f0f2f5]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-full aspect-[1.91/1] object-cover" />
      ) : (
        <div className="w-full aspect-[1.91/1] flex items-center justify-center text-xs text-gray-400 bg-gray-100">
          No share image
        </div>
      )}
      <div className="p-3">
        <div className="text-[11px] uppercase text-gray-500 truncate">{origin.replace("https://", "")}</div>
        <div className="text-sm font-semibold text-[#050505] line-clamp-2">{title}</div>
        <div className="text-xs text-gray-500 line-clamp-2">{description}</div>
      </div>
    </div>
  );
}

export function siteOrigin(siteUrl: string, fallback: string) {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return fallback;
  }
}

export function MissingTablesNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
      The SEO tables don&apos;t exist yet. Run <code className="font-mono font-bold">supabase/seo.sql</code> in the Supabase SQL
      Editor, then reload. Until then the site shows its original text and nothing can be saved.
    </div>
  );
}
