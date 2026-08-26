import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import https from 'https';
import { URL } from 'url';

const bodySchema = z.object({
  message: z.string().min(1),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { message, history = [] } = parsed.data;

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

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('[API AI] Error:', error.message);
    return NextResponse.json(
      { error: 'AI service error', detail: error.message },
      { status: 500 }
    );
  }
}
