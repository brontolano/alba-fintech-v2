import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { deleteStoredFile, saveImage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image || image.size === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Simpan ke penyimpanan terpusat — saveImage memvalidasi tipe & ukuran
    const stored = await saveImage({
      bytes: Buffer.from(await image.arrayBuffer()),
      mimeType: image.type,
      folder: "profiles",
    });

    // Hapus gambar profil lama (upload lokal) bila ada
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });
    if (existing?.image && existing.image !== stored.url) {
      await deleteStoredFile(existing.image);
    }

    // Update user profile image
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: stored.url },
    });

    return NextResponse.json({ data: updatedUser }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Profile Image API] Error:", error);
    const isValidation =
      message.includes("Tipe file") || message.includes("Ukuran file");
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 },
    );
  }
}