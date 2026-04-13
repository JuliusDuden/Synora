'use client';

export type CalendarCategory = {
  id: string;
  name: string;
  color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  categoryId: string;
  start: string;
  end: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval: number;
  recurrenceUntil?: string | null;
  location: string;
  meetingUrl: string;
  notes: string;
  sourceId?: string;
};

export type GoogleAuthState = {
  accessToken: string;
  expiresAt: number;
  connectedAt: string;
};

export const CATEGORY_KEY = 'calendar_categories_v1';
export const EVENTS_KEY = 'calendar_events_v1';
export const GOOGLE_AUTH_KEY = 'calendar_google_auth_v1';
export const GOOGLE_SYNC_META_KEY = 'calendar_google_sync_meta_v1';
export const GOOGLE_AUTO_SYNC_KEY = 'calendar_google_auto_sync_v1';
export const GOOGLE_CALENDAR_SOURCE_ID = 'google-primary';

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function parseRRule(rrule?: string) {
  const fallback = { recurrence: 'none' as const, recurrenceInterval: 1, recurrenceUntil: '' };
  if (!rrule) return fallback;
  const parts = Object.fromEntries(
    rrule.split(';').map((part) => {
      const [k, v] = part.split('=');
      return [k?.toUpperCase(), v || ''];
    })
  );
  const freq = (parts.FREQ || '').toUpperCase();
  const recurrence =
    freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY' || freq === 'YEARLY'
      ? freq.toLowerCase()
      : 'none';
  const recurrenceInterval = Math.max(1, Number(parts.INTERVAL || '1') || 1);
  const recurrenceUntil = parts.UNTIL ? parseIcsLikeDate(parts.UNTIL).slice(0, 10) : '';
  return { recurrence: recurrence as CalendarEvent['recurrence'], recurrenceInterval, recurrenceUntil };
}

function parseIcsLikeDate(raw: string) {
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    return `${y}-${m}-${d}T09:00:00`;
  }
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    const hh = value.slice(9, 11);
    const mm = value.slice(11, 13);
    const ss = value.slice(13, 15);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 19) : parsed.toISOString().slice(0, 19);
}

function toInternalDateString(raw: string, fallback: string) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 19);
}

function convertGoogleEvents(items: any[], fallbackCategoryId: string): CalendarEvent[] {
  return items
    .filter((item) => item?.start?.dateTime || item?.start?.date)
    .map((item) => {
      const startRaw = item.start.dateTime || `${item.start.date}T09:00:00`;
      const endRaw = item.end?.dateTime || `${item.end?.date || item.start.date}T10:00:00`;
      const recurrenceRuleRaw = Array.isArray(item.recurrence) ? String(item.recurrence[0] || '') : '';
      const recurrenceRule = recurrenceRuleRaw.startsWith('RRULE:') ? recurrenceRuleRaw.slice(6) : recurrenceRuleRaw;
      const parsedRule = parseRRule(recurrenceRule);
      const notes = typeof item.description === 'string' ? item.description : '';
      const meetingUrl =
        item.hangoutLink ||
        item.conferenceData?.entryPoints?.find((ep: any) => ep?.uri)?.uri ||
        (notes.match(/https?:\/\/\S+/)?.[0] || '');

      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        title: item.summary || 'Google Termin',
        categoryId: fallbackCategoryId,
        start: toInternalDateString(startRaw, `${new Date().toISOString().slice(0, 10)}T09:00:00`),
        end: toInternalDateString(endRaw, `${new Date().toISOString().slice(0, 10)}T10:00:00`),
        recurrence: parsedRule.recurrence,
        recurrenceInterval: parsedRule.recurrenceInterval,
        recurrenceUntil: parsedRule.recurrenceUntil || null,
        location: item.location || '',
        meetingUrl: meetingUrl || '',
        notes,
        sourceId: GOOGLE_CALENDAR_SOURCE_ID,
      } as CalendarEvent;
    });
}

export function readGoogleAuth(): GoogleAuthState | null {
  return loadJSON<GoogleAuthState | null>(GOOGLE_AUTH_KEY, null);
}

export function writeGoogleAuth(next: GoogleAuthState | null) {
  saveJSON(GOOGLE_AUTH_KEY, next);
}

export function clearGoogleAuth() {
  saveJSON(GOOGLE_AUTH_KEY, null);
}

export function isGoogleTokenValid(state: GoogleAuthState | null) {
  if (!state) return false;
  return state.expiresAt > Date.now() + 30_000;
}

export function writeGoogleSyncMeta(next: { lastSyncedAt?: string }) {
  saveJSON(GOOGLE_SYNC_META_KEY, next);
}

export function clearGoogleImportedEvents() {
  const events = loadJSON<CalendarEvent[]>(EVENTS_KEY, []);
  const next = events.filter((ev) => ev.sourceId !== GOOGLE_CALENDAR_SOURCE_ID);
  saveJSON(EVENTS_KEY, next);
}

export async function syncGooglePrimaryCalendar(accessToken: string): Promise<number> {
  let pageToken = '';
  const allItems: any[] = [];

  while (true) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('showDeleted', 'false');
    url.searchParams.set('maxResults', '2500');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = new Error('Google Kalender konnte nicht synchronisiert werden');
      (err as any).status = response.status;
      throw err;
    }

    const payload = await response.json();
    allItems.push(...(payload.items || []));
    if (!payload.nextPageToken) break;
    pageToken = payload.nextPageToken;
  }

  const categories = loadJSON<CalendarCategory[]>(CATEGORY_KEY, []);
  const fallbackCategoryId = categories[0]?.id || 'work';
  const imported = convertGoogleEvents(allItems, fallbackCategoryId);
  const events = loadJSON<CalendarEvent[]>(EVENTS_KEY, []);
  const keep = events.filter((ev) => ev.sourceId !== GOOGLE_CALENDAR_SOURCE_ID);
  saveJSON(EVENTS_KEY, [...keep, ...imported]);
  writeGoogleSyncMeta({ lastSyncedAt: new Date().toISOString() });

  return imported.length;
}
