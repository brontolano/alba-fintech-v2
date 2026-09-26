"use client";

import { useRef, useState } from "react";
import { Loader2, Nfc } from "lucide-react";
import { toast } from "sonner";
import { isWebNfcSupported, normalizeUid, scanNfcUid } from "@/lib/nfc";

interface NfcUidInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  showHint?: boolean;
  buttonLabel?: string;
  className?: string;
}

/**
 * Input UID kartu NFC yang menerima tiga jalur pembaca:
 * manual (ketik), reader USB/Bluetooth (keyboard-wedge, cukup Enter),
 * dan Web NFC HP Android Chrome via tombol "Tempel".
 */
export default function NfcUidInput({
  value,
  onChange,
  onEnter,
  placeholder = "Tempel kartu / ketik UID, lalu Enter",
  disabled = false,
  autoFocus = false,
  label,
  showHint = true,
  buttonLabel = "Tempel",
  className = "",
}: NfcUidInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const webNfc = isWebNfcSupported();

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const uid = await scanNfcUid();
      const normalized = normalizeUid(uid);
      onChange(normalized);
      toast.success(`Kartu terbaca · UID ${normalized}`);
      inputRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membaca kartu");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className={className}>
      {label ? (
        <label className="mb-1 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition placeholder:font-sans focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
        />
        {webNfc ? (
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || disabled}
            aria-label="Tempel kartu NFC ke belakang ponsel"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Nfc size={16} />
            )}
            {scanning ? "Menunggu..." : buttonLabel}
          </button>
        ) : null}
      </div>
      {showHint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {webNfc
            ? "Tempelkan kartu ke belakang ponsel setelah menekan “Tempel”. "
            : "Tempelkan kartu ke reader USB/Bluetooth — UID terisi otomatis lalu Enter. "}
          <span className="hidden sm:inline">Bisa juga diketik manual.</span>
        </p>
      ) : null}
    </div>
  );
}