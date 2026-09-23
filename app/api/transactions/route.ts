import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import {
  resolveApprover,
  resolveLembagaUnit,
  notifyPendingApproval,
  LEMBAGA_UNIT_SENTINEL,
} from "@/lib/approvalRouting";
import { buildTransactionSummary } from "@/lib/modules/transactions/summary";
import { validateBusinessFlow } from "@/lib/modules/units/business-rules";

// Allowed file types for photo uploads
const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

// Schema for creating transactions
const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.number().positive("Jumlah harus positif"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().optional(),
  photoUrl: z.string().optional(),
  paymentMethod: z.string().optional(),
  orderItems: z
    .array(
      z.object({
        itemName: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number().optional(),
        itemId: z.string().optional(),
      }),
    )
    .optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  range: z.enum(["today", "7d", "30d", "90d"]).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Build where clause
    const where: any = {};
    const role = session.user.role as string;

    if (!["STAFF", "MANAGER", "PIMPINAN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Role-based filtering - STAFF and MANAGER can only see their unit
    if (role === "STAFF" || role === "MANAGER") {
      if (!session.user.unitId) {
        return NextResponse.json(
          { error: "User tidak memiliki unit" },
          { status: 400 },
        );
      }
      where.unitId = session.user.unitId;
    } else if (role === "PIMPINAN") {
      // Pimpinan sees all transactions from units in their lembaga
      if (!session.user.lembagaId) {
        return NextResponse.json(
          { error: "Pimpinan tidak memiliki lembaga" },
          { status: 403 },
        );
      }
      const unitIds = await prisma.unit
        .findMany({
          where: { lembagaId: session.user.lembagaId },
          select: { id: true },
        })
        .then((units) => units.map((u) => u.id));
      where.unitId = { in: unitIds };
    }

    // Query parameter filtering (SUPERADMIN only can override role-based filters)
    if (parsed.data.unitId && role === "SUPERADMIN") {
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }
    if (parsed.data.categoryId) {
      where.categoryId = parsed.data.categoryId;
    }
    // Filter by transaction date, not createdAt
    if (parsed.data.startDate || parsed.data.endDate) {
      where.date = {};
      if (parsed.data.startDate) {
        where.date.gte = new Date(parsed.data.startDate);
      }
      if (parsed.data.endDate) {
        const end = new Date(parsed.data.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Range filter (today, 7d, 30d, 90d)
    if (parsed.data.range) {
      const now = new Date();
      let startDate: Date | null = null;
      switch (parsed.data.range) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      if (startDate) {
        where.date = { ...(where.date || {}), gte: startDate };
      }
    }

    // Text search on description and reference
    // (mode 'insensitive' tidak didukung konektor MySQL — MySQL default sudah case-insensitive)
    if (parsed.data.search) {
      where.OR = [
        { description: { contains: parsed.data.search } },
        { reference: { contains: parsed.data.search } },
      ];
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        status: true,
        reference: true,
        units: { select: { name: true } },
        bank_accounts: { select: { name: true } },
        financial_categories: { select: { name: true } },
        users_transactions_createdByIdTousers: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: "desc", // Order by transaction date, not creation date (for POS)
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.transaction.count({ where });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const summaryBaseWhere = {
      ...where,
      date: where.date ? { ...where.date } : undefined,
    };

    const [
      todayCount,
      pendingCount,
      draftCount,
      ledgerTotals,
      todayLedgerTotals,
    ] = await Promise.all([
      prisma.transaction.count({
        where: {
          ...summaryBaseWhere,
          date: {
            ...(summaryBaseWhere.date || {}),
            gte: todayStart,
          },
        },
      }),
      prisma.transaction.count({
        where: {
          ...summaryBaseWhere,
          status: "PENDING",
        },
      }),
      prisma.transaction.count({
        where: {
          ...summaryBaseWhere,
          status: "DRAFT",
        },
      }),
      prisma.transaction.findMany({
        where: summaryBaseWhere,
        select: {
          type: true,
          amount: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          ...summaryBaseWhere,
          date: {
            ...(summaryBaseWhere.date || {}),
            gte: todayStart,
          },
        },
        select: {
          type: true,
          amount: true,
        },
      }),
    ]);

    const totalIncome = ledgerTotals
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalExpense = ledgerTotals
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const todayIncome = todayLedgerTotals
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const todayExpense = todayLedgerTotals
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const summary = buildTransactionSummary({
      total,
      limit: parsed.data.limit,
      todayCount,
      pendingCount,
      draftCount,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      todayIncome,
      todayExpense,
      netToday: todayIncome - todayExpense,
    });

    // Saldo berjalan untuk format Buku Kas: hitung dari seluruh transaksi
    // dalam lingkup filter (urut tanggal naik). INCOME menambah kas, EXPENSE
    // mengurangi; TRANSFER & REJECTED tidak memengaruhi saldo (konsisten
    // dengan netBalance pada summary).
    const ledgerForBalance = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    let running = 0;
    const balanceAfter = new Map<string, number>();
    for (const tx of ledgerForBalance) {
      if (tx.status === "REJECTED") continue;
      if (tx.type === "INCOME") running += Number(tx.amount || 0);
      else if (tx.type === "EXPENSE") running -= Number(tx.amount || 0);
      balanceAfter.set(tx.id, running);
    }

    // Transform data to match frontend expectations
    const transformedTransactions = transactions.map((tx) => ({
      ...tx,
      unitName: tx.units?.name,
      accountName: tx.bank_accounts?.name,
      categoryName: tx.financial_categories?.name,
      createdByName: tx.users_transactions_createdByIdTousers?.name,
      balanceAfter: balanceAfter.get(tx.id) ?? 0,
    }));

    return NextResponse.json(
      {
        data: transformedTransactions,
        summary,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Transactions API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC - MANAGER, STAFF, PIMPINAN, SUPERADMIN can create transactions
    const role = session.user.role;
    if (
      role !== "MANAGER" &&
      role !== "STAFF" &&
      role !== "PIMPINAN" &&
      role !== "SUPERADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body - handle both JSON and multipart form data
    let body: any;
    const contentType = request.headers.get("content-type");
    let photoUrl: string | null = null;

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      // Support either a JSON 'transactionData' string or individual form fields
      const transactionData = formData.get("transactionData") as string | null;
      if (transactionData) {
        body = JSON.parse(transactionData);
      } else {
        body = {
          type: formData.get("type"),
          amount: parseFloat((formData.get("amount") as string) || "0"),
          description: formData.get("description"),
          unitId: formData.get("unitId") || undefined,
          categoryId: formData.get("categoryId") || undefined,
          accountId: formData.get("accountId") || undefined,
          reference: formData.get("reference") || undefined,
          date: formData.get("date") || undefined,
          photoUrl: formData.get("photoUrl") || undefined,
          orderItems: formData.get("orderItems")
            ? JSON.parse(formData.get("orderItems") as string)
            : undefined,
        };
      }

      // Handle photo upload
      const photo = formData.get("photo") as File | null;
      if (photo && photo.size > 0) {
        // Validate file type
        if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
          return NextResponse.json(
            {
              error:
                "Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.",
            },
            { status: 400 },
          );
        }

        // Validate file size
        if (photo.size > MAX_PHOTO_SIZE) {
          return NextResponse.json(
            { error: "Ukuran file terlalu besar. Maksimal 5MB." },
            { status: 400 },
          );
        }

        try {
          const uploadDir = join(
            process.cwd(),
            "public",
            "uploads",
            "transactions",
          );

          if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
          }

          const buffer = await photo.arrayBuffer();
          const extension = photo.type.split("/")[1] || "jpg";
          const fileName = `transaction_${uuidv4()}.${extension}`;
          const filePath = join(uploadDir, fileName);

          const nodeBuffer = Buffer.from(buffer);
          const { promises: fsPromises } = await import("fs");
          await fsPromises.writeFile(filePath, nodeBuffer);
          photoUrl = `/uploads/transactions/${fileName}`;
        } catch (error) {
          console.error("Error uploading photo:", error);
          return NextResponse.json(
            { error: "Gagal mengunggah foto" },
            { status: 500 },
          );
        }
      }
    } else {
      body = await request.json();
    }

    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Normalisasi paymentMethod ke uppercase (cash -> CASH, card -> CARD)
    const normalizedBody = { ...parsed.data };
    if (normalizedBody.paymentMethod) {
      normalizedBody.paymentMethod = normalizedBody.paymentMethod
        .toUpperCase()
        .trim();
    }

    // Use photoUrl from body or uploaded file
    const finalPhotoUrl = photoUrl || parsed.data.photoUrl || null;

    // Auto-assign unit for MANAGER/STAFF (they belong to a single unit).
    // PIMPINAN boleh mencatat transaksi level lembaga (tanpa unit) —
    // ditandai sentinel atau unit kosong -> dipetakan ke unit virtual lembaga.
    const { unitId: _clientUnitId, ...safeBody } = parsed.data;
    let unitId =
      role === "MANAGER" || role === "STAFF"
        ? session.user.unitId
        : _clientUnitId;

    const isLembagaScope =
      role === "PIMPINAN" &&
      (!unitId || unitId === LEMBAGA_UNIT_SENTINEL || unitId === "");

    if (isLembagaScope) {
      if (!session.user.lembagaId) {
        return NextResponse.json(
          { error: "Pimpinan tidak memiliki lembaga" },
          { status: 403 },
        );
      }
      const lembagaUnit = await resolveLembagaUnit(session.user.lembagaId);
      if (!lembagaUnit) {
        return NextResponse.json(
          { error: "Gagal menyiapkan unit lembaga" },
          { status: 500 },
        );
      }
      unitId = lembagaUnit.id;
    }

    const parsedData = { ...safeBody, unitId } as typeof parsed.data & {
      unitId?: string;
    };

    if (!parsedData.unitId) {
      return NextResponse.json(
        { error: "Unit wajib dipilih" },
        { status: 400 },
      );
    }

    const targetUnit = await prisma.unit.findUnique({
      where: { id: parsedData.unitId },
      select: { id: true, type: true, isRetail: true },
    });

    if (!targetUnit) {
      return NextResponse.json(
        { error: "Unit tidak ditemukan" },
        { status: 400 },
      );
    }

    if (role === "PIMPINAN" && !isLembagaScope) {
      const unitInLembaga = await prisma.unit.findFirst({
        where: { id: parsedData.unitId, lembagaId: session.user.lembagaId },
        select: { id: true },
      });
      if (!unitInLembaga) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const businessCheck = validateBusinessFlow({
      unitType: targetUnit.type || undefined,
      isRetail: targetUnit.isRetail ?? false,
      transactionType: parsed.data.type,
      description: parsed.data.description,
    });

    if (!businessCheck.valid) {
      return NextResponse.json(
        {
          error: businessCheck.reason,
          expectedExamples: businessCheck.expectedExamples,
        },
        { status: 400 },
      );
    }

    // Parse orderItems if present
    const orderItemsData = parsedData.orderItems || [];

    // Validate unit settings for POS transactions (orderItems)
    if (orderItemsData && orderItemsData.length > 0) {
      const unitSettings = await prisma.unitSetting.findUnique({
        where: { unitId: parsedData.unitId! },
      });
      if (!unitSettings?.inventoryEnabled) {
        return NextResponse.json(
          { error: "Unit tidak memiliki inventory yang diaktifkan untuk POS" },
          { status: 400 },
        );
      }
    }

    // Validate inventory items if provided (for POS transactions) + hitung pengurangan stok
    const stockDecrement: { id: string; qty: number }[] = [];
    for (const item of orderItemsData) {
      // Auto-calculate totalPrice if not provided or invalid
      if (item.unitPrice !== undefined && item.quantity !== undefined) {
        item.totalPrice = Number(item.unitPrice) * Number(item.quantity);
      }

      if (item.itemId) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: {
            id: true,
            unitId: true,
            name: true,
            currentStock: true,
            isActive: true,
          },
        });
        if (!inventoryItem || inventoryItem.unitId !== parsedData.unitId) {
          return NextResponse.json(
            { error: `Item tidak ditemukan: ${item.itemName || item.itemId}` },
            { status: 400 },
          );
        }
        if (!inventoryItem.isActive) {
          return NextResponse.json(
            { error: `Item sudah tidak aktif: ${inventoryItem.name}` },
            { status: 400 },
          );
        }
        const qty = Number(item.quantity) || 0;
        if (qty > (inventoryItem.currentStock ?? 0)) {
          return NextResponse.json(
            {
              error: `Stok tidak mencukupi untuk ${inventoryItem.name}. Tersedia: ${inventoryItem.currentStock ?? 0}`,
            },
            { status: 400 },
          );
        }
        stockDecrement.push({ id: inventoryItem.id, qty });
      }
    }

    // Routing persetujuan berdasarkan konfigurasi unit:
    //  - Transaksi rutin unit bisa auto-approve bila unit mengizinkan (requiresApproval = false)
    //  - Transaksi pembelian / penggunaan dana masih masuk approval manager/pimpinan
    //  - PIMPINAN / SUPERADMIN selalu final authority
    const unitSettings = await prisma.unitSetting.findUnique({
      where: { unitId: parsedData.unitId! },
      select: { requiresApproval: true, autoApproval: true },
    });

    // Business rule: transaksi rutin unit tidak perlu approval pimpinan.
    // Approval hanya dipakai untuk pengajuan khusus / kasus exception.
    // (FILE BEKU staff-freeze: jangan tambah kasus khusus di sini.
    //  Pengajuan anggaran lewat endpoint khusus /api/kpak/budget-submit.)
    // Aturan pemilik: pengeluaran Unit KPAK TIDAK butuh persetujuan —
    // hanya pengajuan ke pimpinan + anggaran yang lewat approval.
    const txUnit = await prisma.unit.findUnique({
      where: { id: parsedData.unitId! },
      select: { type: true },
    });
    const isKpakUnit = !isLembagaScope && txUnit?.type === "KPAK";
    const requiresApproval =
      !isLembagaScope &&
      !isKpakUnit &&
      (unitSettings?.requiresApproval ?? false);
    const isFinalAuthority = role === "PIMPINAN" || role === "SUPERADMIN";
    const initialStatus =
      isFinalAuthority || !requiresApproval ? "APPROVED" : "PENDING";

    // Create transaction with orderItems (dan pengurangan stok jika POS)
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          unitId: parsedData.unitId!,
          type: parsed.data.type,
          amount: parsed.data.amount,
          description: parsed.data.description,
          categoryId: parsed.data.categoryId,
          accountId: parsed.data.accountId,
          reference: parsed.data.reference,
          date: parsed.data.date ? new Date(parsed.data.date) : undefined,
          paymentMethod: normalizedBody.paymentMethod || undefined,
          createdById: session.user.id!,
          status: initialStatus,
          isPimpinanNote: isLembagaScope ? true : undefined,
          approvedById: isFinalAuthority ? session.user.id : undefined,
          approvedAt: isFinalAuthority ? new Date() : undefined,
          photoUrl: finalPhotoUrl,
          order_items: {
            create: orderItemsData.map((item: any) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              itemId: item.itemId,
            })),
          },
        },
      });

      // Integrasi POS -> inventory: kurangi stok atomik (guard currentStock >= qty)
      for (const s of stockDecrement) {
        const res = await tx.inventoryItem.updateMany({
          where: { id: s.id, currentStock: { gte: s.qty } },
          data: { currentStock: { decrement: s.qty } },
        });
        if (res.count === 0) {
          throw new Error(
            `Stok berubah saat checkout. Muat ulang halaman dan coba lagi.`,
          );
        }
      }

      return created;
    });

    // Buat record Approval untuk transaksi unit yang memang memerlukan approval.
    // Jika unit di-set auto-approve, transaksi langsung APPROVED dan tidak masuk approval queue.
    if (!isFinalAuthority && requiresApproval) {
      const approverId = await resolveApprover(parsedData.unitId!, role);
      if (approverId) {
        await prisma.approval.create({
          data: {
            transactionId: transaction.id,
            approverId,
            unitId: parsedData.unitId!,
            status: "PENDING",
          },
        });

        // Notifikasi ke approver (non-blocking)
        const unitName = await prisma.unit
          .findUnique({
            where: { id: parsedData.unitId! },
            select: { name: true },
          })
          .then((u) => u?.name);
        await notifyPendingApproval({
          approverId,
          transactionId: transaction.id,
          description: parsed.data.description,
          amount: parsed.data.amount,
          creatorName: session.user.name || session.user.email || "Pengguna",
          unitName,
        });
      }
    } else if (!isFinalAuthority && !requiresApproval) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error: any) {
    console.error("[Transactions API] Error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Data duplikat: referensi sudah digunakan" },
        { status: 409 },
      );
    }
    if (error?.message?.includes("Stok berubah")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Gagal memproses data transaksi. Periksa koneksi database." },
      { status: 500 },
    );
  }
}
