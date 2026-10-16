"use client";

import { useState } from "react";
import { saveBusinessInfo } from "@/app/admin/actions";
import { actionFailed, uploadAdminImage } from "@/app/admin/client-helpers";
import type { BusinessInfo } from "@/lib/seo";
import { useStudio } from "../studio-context";
import { Label, MissingTablesNotice, SaveButton, ShareImageInput, inputClass } from "../fields";

const GROUPS: { title: string; fields: [keyof BusinessInfo, string, string?, string?][] }[] = [
  {
    title: "Basics",
    fields: [
      ["name", "Restaurant name"],
      ["site_url", "Website address", "https://boatseafood.ae"],
      ["phone", "Phone", "+971 4 123 4567"],
      ["email", "Email"],
      ["cuisine", "Cuisine", "Seafood"],
      ["price_range", "Price range", "$$"],
    ],
  },
  {
    title: "Address",
    fields: [
      ["street", "Street"],
      ["locality", "Area", "Deira"],
      ["region", "City", "Dubai"],
      ["postal_code", "Postal code"],
      ["country", "Country code", "AE"],
      ["latitude", "Latitude"],
      ["longitude", "Longitude"],
    ],
  },
  {
    title: "Opening hours (every day)",
    fields: [
      ["opens", "Opens", undefined, "time"],
      ["closes", "Closes", undefined, "time"],
    ],
  },
  {
    title: "Social links",
    fields: [
      ["instagram", "Instagram"],
      ["facebook", "Facebook"],
      ["tiktok", "TikTok"],
    ],
  },
];

export default function StudioBusinessPage() {
  const studio = useStudio();
  const { data } = studio;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!data) return <div className="h-60 flex items-center justify-center text-gray-400">Loading…</div>;

  const business = data.business;
  const dirty = studio.isBusinessDirty();
  const update = (key: keyof BusinessInfo, value: string) => studio.setBusiness({ ...business, [key]: value });

  const save = async () => {
    setSaving(true);
    const res = await saveBusinessInfo(business);
    setSaving(false);
    if (actionFailed(res)) return;
    studio.markBusinessSaved();
    setSaved(true);
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1">Business Info</h1>
        <p className="text-sm md:text-base text-gray-500">
          Google reads these details from the home page to show the address, hours and phone in search results. Keep
          them the same as the Google Business Profile.
        </p>
      </div>

      {data.missingTables && <MissingTablesNotice />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-8">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="font-playfair text-lg font-bold text-navy mb-4">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.fields.map(([key, label, placeholder, type]) => (
                <label key={key} className="block">
                  <Label>{label}</Label>
                  <input
                    type={type ?? "text"}
                    value={business[key]}
                    placeholder={placeholder}
                    onChange={(e) => update(key, e.target.value)}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div>
          <Label hint="Used on any page without its own share image. 1200 × 630.">Default share image</Label>
          <ShareImageInput
            value={business.default_og_image}
            uploading={uploading}
            onFile={async (file) => {
              setUploading(true);
              const url = await uploadAdminImage("seo", file);
              setUploading(false);
              if (url) update("default_og_image", url);
            }}
            onClear={() => update("default_og_image", "")}
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <SaveButton saving={saving} saved={saved} dirty={dirty} onClick={save} />
        </div>
      </div>
    </div>
  );
}
