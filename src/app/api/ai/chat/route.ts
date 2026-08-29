import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import https from 'https';
import { URL } from 'url';
import { promises as fs } from 'fs';  // Gunakan async fs
import { join } from 'path';
import { tmpdir } from 'os';

const bodySchema = z.object({
  message: z.string().min(1),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
});

// Accept either JSON or FormData (for file uploads)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let message = '';
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let uploadedFilePath: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData untuk file upload
      const formData = await request.formData();
      message = formData.get('message') as string || '';
      const historyStr = formData.get('history') as string || '[]';
      try {
        history = JSON.parse(historyStr);
      } catch {
        history = [];
      }

      const file = formData.get('file') as File | null;
      if (file) {
        // Simpan file ke temp dir — gunakan async fs agar tidak blocking
        const tempDir = join(tmpdir(), 'alba-ai-uploads');
        await fs.mkdir(tempDir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        uploadedFilePath = join(tempDir, `${Date.now()}_${file.name}`);
        await fs.writeFile(uploadedFilePath, buffer);
        message += `\n📎 File: ${file.name}`;
      }
    } else {
      const json = await request.json();
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      message = parsed.data.message;
      history = parsed.data.history || [];
    }

    const providerURL = process.env.AI_PROVIDER_URL;
    const apiKey = process.env.AI_PROVIDER_KEY;
    const model = process.env.AI_PROVIDER_MODEL || 'Hamdan-MAX';

    if (!providerURL || !apiKey) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 500 }
      );
    }

    const baseUrl = providerURL.startsWith('http') ? providerURL : `https://${providerURL}`;

    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ];

    const payload = JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false,
    });

    const parsedUrl = new URL(baseUrl);
    // Pastikan path selalu diawali "/chat/completions" — hindari duplikat /v1/v1/...
    const trimmed = parsedUrl.pathname.replace(/\/+$/, '');
    const path = `${trimmed}/chat/completions`;

    const assistantMessage = await new Promise<string>((resolve, reject) => {
      const req = https.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              resolve(data.choices?.[0]?.message?.content ?? data.message?.content ?? '');
            } catch (parseError) {
              // Respons bukan JSON — fallback ke teks mentah agar UI tetap dapat balasan
              resolve(body || 'Maaf, tidak dapat memproses respons dari AI provider.');
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 500)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('AI provider request timed out after 30s'));
      });
      req.write(payload);
      req.end();
    });

    // Check if assistant response mentions broadcast/notification — suggest a draft
    const lowerResponse = assistantMessage.toLowerCase();
    const lowerMessage = message.toLowerCase();
    const isBroadcastContext = lowerResponse.includes('broadcast') || lowerMessage.includes('broadcast') || lowerMessage.includes('notifikasi') || lowerMessage.includes('kirim');

    let suggestedBroadcast = null;
    if (isBroadcastContext) {
      // Generate broadcast draft based on conversation
      const broadcastDraft = await new Promise<string>((resolve) => {
        if (!providerURL || !apiKey) {
          resolve(null as any);
          return;
        }
        const broadcastPrompt = JSON.stringify({
          model,
          messages: [
            ...history.slice(-5).map((h) => ({ role: h.role, content: h.content })),
            {
              role: 'user' as const,
              content: `Berikut adalah percakapan dengan pengguna. Tolong rancangkan 2-3 varian judul dan pesan broadcast yang sesuai untuk dikirim ke seluruh pengguna aplikasi keuangan. Fokus pada ${isBroadcastContext ? 'notifikasi penting dari pimpinan' : 'informasi umum'}. Kembalikan dalam format JSON: {"title": "...", "message": "...", "type": "INFO|SUCCESS|WARNING|ERROR", "priority": "LOW|NORMAL|HIGH|URGENT"}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const req = https.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(broadcastPrompt),
          },
        }, (res2) => {
          let body2 = '';
          res2.on('data', (chunk) => { body2 += chunk; });
          res2.on('end', () => {
            try {
              const data = JSON.parse(body2);
              resolve(data.choices?.[0]?.message?.content ?? '');
            } catch {
              resolve('');
            }
          });
        });
        req.on('error', () => resolve(''));
        req.write(broadcastPrompt);
        req.end();
      });

      if (broadcastDraft) {
        try {
          suggestedBroadcast = JSON.parse(broadcastDraft);
        } catch {
          // If AI didn't return valid JSON, create a default draft
          suggestedBroadcast = {
            title: 'Pemberitahuan dari Pimpinan',
            message: 'Assalamu\'alaikum warahmatullahi wabarakatuh. Berikut pesan dari pimpinan untuk seluruh pengguna.',
            type: 'INFO',
            priority: 'NORMAL',
          };
        }
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      suggestedBroadcast: suggestedBroadcast,
      usage: {
        prompt_tokens: Math.ceil(message.length / 4),
        completion_tokens: Math.ceil(assistantMessage.length / 4),
      },
    });
  } catch (error: any) {
    console.error('[API AI] Error:', error.message);
    return NextResponse.json(
      { error: 'AI service error', detail: error.message },
      { status: 500 }
    );
  }
}
