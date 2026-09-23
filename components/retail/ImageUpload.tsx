"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";

export function ImageUpload({
  value,
  onChange,
  label = "Upload foto",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value ?? null);
  }, [value]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload gagal");
      setPreview(body.url);
      onChange(body.url);
    } catch (err: any) {
      alert(err.message || "Upload gagal");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const remove = () => {
    setPreview(null);
    onChange(null);
  };

  return (
    <label className="relative flex h-20 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted transition-colors hover:bg-accent">
      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          {busy ? (
            <span className="text-xs"> mengunggah…</span>
          ) : (
            <>
              <Upload size={16} />
              <span className="text-xs">{label}</span>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        onChange={handleUpload}
        className="hidden"
      />
      {preview && !busy && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            remove();
          }}
          className="absolute right-1 top-1 rounded-full bg-rose-600/90 p-0.5 text-white"
        >
          <X size={12} />
        </button>
      )}
    </label>
  );
};
