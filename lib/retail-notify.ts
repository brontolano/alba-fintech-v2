import prisma from "@/lib/prisma";

/**
 * Notifikasi ringan ke semua MANAGER aktif suatu unit retail.
 * Non-blocking: kegagalan notifikasi tidak menggagalkan request utama.
 */
export async function notifyUnitManagers(
  unitId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    const managers = await prisma.user.findMany({
      where: { unitId, role: "MANAGER", isActive: true },
      select: { id: true },
    });
    if (managers.length === 0) return;
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        title: title.slice(0, 255),
        message,
        type: "WARNING",
      })),
    });
  } catch {
    // abaikan — notifikasi opsional
  }
}
