"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uk } from "@/lib/i18n/uk";

export function RecipeImageFields({
  imageUrl,
  onImageUrlChange,
  onUploaded,
}: {
  imageUrl: string;
  onImageUrlChange: (v: string) => void;
  /** Після успішного завантаження на Cloudinary (url + public_id). */
  onUploaded?: (url: string, publicId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const res = await fetch("/api/upload/recipe-image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        url?: string;
        secure_url?: string;
        publicId?: string;
        public_id?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? uk.upload.failed);
        return;
      }
      const url = data.url ?? data.secure_url;
      const pid = data.publicId ?? data.public_id;
      if (url) {
        if (onUploaded && pid) {
          onUploaded(url, pid);
        } else {
          onImageUrlChange(url);
        }
        setPreviewError(false);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const showPreview =
    Boolean(imageUrl) &&
    (imageUrl.startsWith("/") || /^https?:\/\//i.test(imageUrl)) &&
    !previewError;

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>{uk.recipeEditor.imageUrl}</Label>
      <Input
        value={imageUrl}
        onChange={(e) => {
          setPreviewError(false);
          onImageUrlChange(e.target.value);
        }}
        placeholder={uk.recipeEditor.imageUrlPlaceholder}
        inputMode="url"
        autoComplete="off"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          onChange={onFile}
          disabled={uploading}
          className="cursor-pointer sm:max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {uploading ? uk.common.loading : uk.recipeEditor.imageUploadHint}
        </span>
      </div>
      {showPreview ? (
        <div className="relative mt-2 aspect-square max-h-80 w-full max-w-sm overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setPreviewError(true)}
          />
        </div>
      ) : null}
      {previewError && imageUrl.trim() ? (
        <p className="text-xs text-muted-foreground">{uk.upload.invalidUrl}</p>
      ) : null}
    </div>
  );
}
