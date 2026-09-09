import { NextResponse } from 'next/server';

// BUG-002: Map Prisma P2002 (unique constraint) error to proper field name
export function mapP2002Error(error: any): string {
    if (error?.code === 'P2002') {
        // error.meta.target is array of field names, e.g. ["email"] or ["lembagaId","code"]
        const targets = (error.meta?.target as string[]) || [];
        if (targets.length > 0) {
            if (targets.length === 1 && targets[0] === 'email') {
                return 'Email sudah terdaftar';
            }
            if (targets.length === 1 && targets[0] === 'sku') {
                return 'SKU sudah digunakan';
            }
            if (targets.includes('code')) {
                return 'Kode sudah digunakan';
            }
            return `Nilai ${targets.join(', ')} sudah digunakan`;
        }
    }
    return 'Data duplikat';
}

// Generic error response handler
export function handleApiError(error: any): NextResponse {
    console.error('API Error:', error);

    if (error?.code) {
        switch (error.code) {
            case 'P2002':
                return NextResponse.json(
                    { error: mapP2002Error(error) },
                    { status: 409 }
                );
            case 'P2003':
                return NextResponse.json(
                    { error: 'Referensi tidak ditemukan' },
                    { status: 400 }
                );
            case 'P2025':
                return NextResponse.json(
                    { error: 'Data tidak ditemukan' },
                    { status: 404 }
                );
            case 'P2001':
                return NextResponse.json(
                    { error: 'Data tidak ditemukan' },
                    { status: 404 }
                );
            default:
                return NextResponse.json(
                    { error: 'Database error' },
                    { status: 500 }
                );
        }
    }

    if (error instanceof SyntaxError) {
        return NextResponse.json(
            { error: 'Format request tidak valid' },
            { status: 400 }
        );
    }

    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}

// BUG-001: Parse multipart/form-data consistently
// Returns parsed body (string/number fields) and files (File | Blob)
export async function parseMultipart(req: Request) {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
        // Fallback to JSON
        const body = await req.json();
        return { body, files: {} as Record<string, any> };
    }

    const formData = await req.formData();
    const body: Record<string, any> = {};
    const files: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
            files[key] = value;
        } else if (typeof value === 'string') {
            // Try to parse JSON strings for fields like orderItems
            try {
                body[key] = JSON.parse(value);
            } catch {
                body[key] = value;
            }
        } else {
            body[key] = value;
        }
    }

    return { body, files };
}

// Helper to convert File to string (for base64 storage)
export async function fileToBase64(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return buffer.toString('base64');
}

// Helper to save file to disk (for profile image upload)
export async function saveUploadedFile(
    file: File,
    uploadDir: string,
    filename?: string
): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const ext = path.extname(file.name || 'file');
    const safeName = filename || `file_${Date.now()}${ext}`;
    const filepath = path.join(uploadDir, safeName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filepath, buffer);

    // Return relative path for static serving
    return `/uploads/${safeName}`;
}

// Pagination helper
export function getPagination(searchParams: URLSearchParams) {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    );
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
