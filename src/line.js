import crypto from 'node:crypto';
import { config } from './config.js';

export function verifyLineSignature(rawBody, signature) {
  if (!signature) return false;
  const digest = crypto
    .createHmac('sha256', config.line.channelSecret)
    .update(rawBody)
    .digest('base64');
  if (Buffer.byteLength(digest) !== Buffer.byteLength(signature)) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export function sourceId(event) {
  const src = event?.source || {};
  return src.groupId || src.roomId || src.userId || null;
}

export async function pushLine(to, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.line.channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE push failed ${res.status}: ${text}`);
  }
}

export async function downloadLineContent(messageId) {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${config.line.channelAccessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE content download failed ${res.status}: ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  };
}
