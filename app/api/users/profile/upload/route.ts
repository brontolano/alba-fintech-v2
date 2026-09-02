import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import { PrismaClient } from '@prisma/client';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function handleProfileImageUpload(imageFile: File): Promise<string | null> {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const buffer = await imageFile.arrayBuffer();
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `profile_${uuidv4()}.${ext}`;
    const filePath = join(uploadDir, fileName);
    
    const nodeBuffer = Buffer.from(buffer);
    const { promises: fsPromises } = require('fs');
    await fsPromises.writeFile(filePath, nodeBuffer);
    
    return `/uploads/profiles/${fileName}`;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    
    if (!image || image.size === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    const imageUrl = await handleProfileImageUpload(image);
    
    // Update user profile image
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    return NextResponse.json({ data: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('[Profile Image API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}