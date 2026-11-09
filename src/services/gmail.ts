/**
 * Gmail Workspace API Client Service
 * Provides client-side calls to Gmail API using the in-memory access token.
 */

import { getGoogleAccessToken } from './googleAuth';

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  labelIds: string[];
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  bodyText: string;
}

/**
 * Base64URL encode string according to RFC 4648 §5
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Helper to get active access token or throw an authentication error
 */
async function getValidToken(): Promise<string> {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('يرجى تسجيل الدخول بحساب Google أولاً للوصول إلى بريد Gmail.');
  }
  return token;
}

/**
 * Fetch current authenticated user's Gmail profile
 */
export async function fetchGmailProfile(): Promise<GmailProfile> {
  const token = await getValidToken();
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل جلب ملف Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * List messages matching query (default max: 15)
 */
export async function listGmailMessages(
  query: string = '',
  maxResults: number = 15
): Promise<GmailMessageSummary[]> {
  const token = await getValidToken();
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل جلب رسائل Gmail (${res.status})`);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch details for retrieved messages in parallel (capped at 15)
  const summaries: GmailMessageSummary[] = await Promise.all(
    rawList.slice(0, 15).map(async (msg) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        
        const headers = detail.payload?.headers || [];
        const getHeader = (name: string) => 
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: detail.id,
          threadId: detail.threadId,
          subject: getHeader('Subject') || '(بدون عنوان)',
          from: getHeader('From') || '',
          to: getHeader('To') || '',
          date: getHeader('Date') || '',
          snippet: detail.snippet || '',
          isUnread: (detail.labelIds || []).includes('UNREAD'),
          labelIds: detail.labelIds || [],
        };
      } catch (err) {
        console.warn(`Error fetching details for message ${msg.id}`, err);
        return null;
      }
    })
  ).then((results) => results.filter((m): m is GmailMessageSummary => m !== null));

  return summaries;
}

/**
 * Fetch a single full message
 */
export async function getGmailMessage(messageId: string): Promise<any> {
  const token = await getValidToken();
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل قراءة الرسالة (${res.status})`);
  }

  return await res.json();
}

/**
 * Send an email through Gmail API
 * NOTE: UI must ALWAYS prompt user for confirmation before invoking this method!
 */
export async function sendGmailMessage(payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const token = await getValidToken();

  // Construct RFC 2822 email format
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;
  const messageParts = [
    `To: ${payload.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    payload.bodyText,
  ];
  const rawMessage = messageParts.join('\r\n');
  const encodedRaw = base64UrlEncode(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedRaw }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل إرسال البريد عبر Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * Move message to Trash
 * NOTE: UI must ALWAYS prompt user for confirmation before invoking this method!
 */
export async function trashGmailMessage(messageId: string): Promise<void> {
  const token = await getValidToken();
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل حذف الرسالة (${res.status})`);
  }
}
