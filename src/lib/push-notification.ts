// lib/push-notification.ts
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@albafintech.id', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Kirim push notification ke semua subscription milik user tertentu.
 * Jika VAPID tidak dikonfigurasi, fungsi ini hanya return (skip silently).
 */
export async function sendPushNotification(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured — skipping push notification');
    return { sent: 0, skipped: true };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, skipped: true };
  }

  webpush.setVapidDetails('mailto:admin@albafintech.id', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || `alba-${Date.now()}`,
    requireInteraction: payload.requireInteraction || false,
  });

  const sendResults = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as any,
        },
        pushPayload
      )
    )
  );

  const sent = sendResults.filter((r) => r.status === 'fulfilled').length;

  return { sent, skipped: false };
}
