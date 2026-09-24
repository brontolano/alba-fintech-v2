"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Phone,
  MapPin,
  Package,
  BadgeCheck,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Owner = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  itemCount?: number;
  whatsappVerified?: boolean | null;
};

type Item = {
  id: string;
  ownerName: string;
  costPrice: number;
  agreedPrice: number;
  marginType: string;
  marginValue: number;
  inventory: {
    name: string;
    sku?: string;
    currentStock?: number;
    unitPrice?: number;
    imageUrl?: string;
  } | null;
};

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = use(params);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [stat, setStat] = useState({ sold: 0, omzet: 0, hak: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const to = new Date().toISOString().slice(0, 10);
        const fromD = new Date();
        fromD.setDate(fromD.getDate() - 29);
        const from = fromD.toISOString().slice(0, 10);
        const [oRes, iRes, rRes] = await Promise.all([
          fetch("/api/retail/consignments/owners"),
          fetch(`/api/retail/consignments/items?ownerId=${ownerId}`),
          fetch(
            `/api/retail/consignments/report?ownerId=${ownerId}&from=${from}&to=${to}`,
          ),
        ]);
        const oBody = await oRes.json();
        if (!oRes.ok) throw new Error(oBody.error || "Gagal memuat UMKM");
        const found = (oBody.data || []).find((o: Owner) => o.id === ownerId);
        if (!found) throw new Error("UMKM tidak ditemukan di unit ini");
        setOwner(found);

        const iBody = await iRes.json();
        if (!iRes.ok) throw new Error(iBody.error || "Gagal memuat barang");
        setItems(iBody.data || []);

        if (rRes.ok) {
          const rBody = await rRes.json();
          const row = (rBody.data?.owners || [])[0];
          if (row)
            setStat({
              sold: row.qtySold ?? 0,
              omzet: Number(row.omzet) || 0,
              hak: Number(row.hakPemilik) || 0,
            });
        }
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ownerId]);

  const waLink = owner?.phone
    ? (() => {
        const d = owner.phone.replace(/\D/g, "");
        const to = d.startsWith("62") ? d : `62${d.replace(/^0/, "")}`;
        return `https://wa.me/${to}`;
      })()
    : null;

  const stockVal = items.reduce(
    (s, it) => s + (it.inventory?.currentStock ?? 0) * Number(it.costPrice),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/retail/konsinyasi"
          aria-label="Kembali"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
          {owner?.name ?? "Detail UMKM"}
        </h1>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
          {err}
        </div>
      )}

      {loading || !owner ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {owner.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{owner.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] opacity-90">
                  {owner.phone ? (
                    <a
                      href={waLink ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 underline"
                    >
                      <Phone size={11} /> {owner.phone}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <Phone size={11} /> —
                    </span>
                  )}
                  {owner.whatsappVerified ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-px font-semibold">
                      <BadgeCheck size={11} /> WA aktif
                    </span>
                  ) : null}
                  {!owner.isActive && (
                    <span className="rounded-full bg-white/20 px-1.5 py-px font-semibold">
                      nonaktif
                    </span>
                  )}
                </p>
                {owner.address && (
                  <p className="mt-0.5 flex items-center gap-0.5 truncate text-[11px] opacity-90">
                    <MapPin size={11} /> {owner.address}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              {[
                { label: "Barang", value: String(items.length) },
                { label: "Laku 30h", value: String(stat.sold) },
                { label: "Omzet", value: fmt(stat.omzet) },
                { label: "Hak", value: fmt(stat.hak) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="min-w-0 rounded-lg bg-white/15 px-1 py-1.5"
                >
                  <p className="truncate text-xs font-bold">{s.value}</p>
                  <p className="text-[10px] opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-2.5">
            <h2 className="mb-1 px-1 text-xs font-semibold text-muted-foreground">
              Barang ({items.length}) · nilai stok {fmt(stockVal)}
            </h2>
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada barang titipan
              </p>
            ) : (
              <div className="divide-y">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-2.5 py-2 text-sm"
                  >
                    {it.inventory?.imageUrl ? (
                      <img
                        src={it.inventory.imageUrl}
                        alt={it.inventory?.name || ""}
                        className="h-9 w-9 shrink-0 rounded-lg border object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Package
                          size={15}
                          className="text-muted-foreground"
                        />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {it.inventory?.name || "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        modal {fmt(Number(it.costPrice))} → jual{" "}
                        {fmt(Number(it.agreedPrice))} ·{" "}
                        {it.marginType === "FIXED" ? "Rp" : "%"}{" "}
                        {Number(it.marginValue)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold">
                        {it.inventory?.currentStock ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">stok</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/dashboard/retail/konsinyasi/laporan"
              className="rounded-xl border bg-card p-2.5 text-center text-xs font-semibold hover:border-primary/50"
            >
              Laporan & Payout
            </Link>
            <Link
              href="/dashboard/retail/stok-masuk"
              className="rounded-xl bg-primary p-2.5 text-center text-xs font-semibold text-primary-foreground"
            >
              + Stok Masuk
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
