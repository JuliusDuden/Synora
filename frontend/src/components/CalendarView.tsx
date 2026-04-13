'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
  Save,
  Link2,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Video,
  Upload,
  X,
  Briefcase,
  Home,
  Tag,
} from 'lucide-react';

type CalendarCategory = {
  id: string;
  name: string;
  color: string;
};

type CalendarEvent = {
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

type CalendarService = {
  id: string;
  name: string;
  url: string;
};

type SyncFeed = {
  id: string;
  name: string;
  url: string;
  lastSyncedAt?: string;
};

type GoogleAuthState = {
  accessToken: string;
  expiresAt: number;
  connectedAt: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

const CATEGORY_KEY = 'calendar_categories_v1';
const EVENTS_KEY = 'calendar_events_v1';
const SERVICES_KEY = 'calendar_services_v1';
const FEEDS_KEY = 'calendar_sync_feeds_v1';
const GOOGLE_AUTH_KEY = 'calendar_google_auth_v1';
const GOOGLE_SYNC_META_KEY = 'calendar_google_sync_meta_v1';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_CALENDAR_SOURCE_ID = 'google-primary';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { id: 'work', name: 'Arbeit', color: '#1d4ed8' },
  { id: 'private', name: 'Privat', color: '#16a34a' },
  { id: 'health', name: 'Gesundheit', color: '#be185d' },
];

const DEFAULT_SERVICES: CalendarService[] = [
  { id: 'google', name: 'Google Calendar', url: 'https://calendar.google.com/' },
  { id: 'notion', name: 'Notion Calendar', url: 'https://calendar.notion.so/' },
  { id: 'outlook', name: 'Outlook Calendar', url: 'https://outlook.live.com/calendar/' },
  { id: 'apple', name: 'Apple iCloud Calendar', url: 'https://www.icloud.com/calendar/' },
];

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
  localStorage.setItem(key, JSON.stringify(value));
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateTimeToIcs(ts: string) {
  const d = new Date(ts);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(input: string) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function unescapeIcs(input: string) {
  return input.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function unfoldIcs(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseIcsDate(raw: string) {
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
  return Number.isNaN(parsed.getTime()) ? toDateInputValue(new Date()) + 'T09:00:00' : parsed.toISOString().slice(0, 19);
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
  const recurrence = freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY' || freq === 'YEARLY' ? freq.toLowerCase() : 'none';
  const recurrenceInterval = Math.max(1, Number(parts.INTERVAL || '1') || 1);
  const recurrenceUntil = parts.UNTIL ? parseIcsDate(parts.UNTIL).slice(0, 10) : '';
  return { recurrence: recurrence as CalendarEvent['recurrence'], recurrenceInterval, recurrenceUntil };
}

function monthDiff(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function occursOnDate(ev: CalendarEvent, dateStr: string) {
  const target = new Date(`${dateStr}T00:00:00`);
  const start = new Date(ev.start);
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const untilDate = ev.recurrenceUntil ? new Date(`${ev.recurrenceUntil}T23:59:59`) : null;

  if (target < startDate) return false;
  if (untilDate && target > untilDate) return false;
  if (ev.recurrence === 'none') return toDateInputValue(startDate) === dateStr;

  const diffDays = Math.floor((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const interval = Math.max(1, ev.recurrenceInterval || 1);

  if (ev.recurrence === 'daily') return diffDays % interval === 0;
  if (ev.recurrence === 'weekly') return diffDays % (7 * interval) === 0;
  if (ev.recurrence === 'monthly') {
    if (target.getDate() !== startDate.getDate()) return false;
    return monthDiff(startDate, target) % interval === 0;
  }
  if (ev.recurrence === 'yearly') {
    if (target.getDate() !== startDate.getDate() || target.getMonth() !== startDate.getMonth()) return false;
    return (target.getFullYear() - startDate.getFullYear()) % interval === 0;
  }
  return false;
}

function eventFingerprint(ev: Pick<CalendarEvent, 'title' | 'start' | 'end' | 'location'>) {
  return `${ev.title.trim().toLowerCase()}|${ev.start}|${ev.end}|${ev.location.trim().toLowerCase()}`;
}

function parseIcsEvents(text: string, defaultCategoryId: string, sourceId?: string): CalendarEvent[] {
  const lines = unfoldIcs(text);
  const parsed: CalendarEvent[] = [];
  let inEvent = false;
  let temp: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      temp = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (inEvent) {
        const title = unescapeIcs(temp.SUMMARY || 'Termin');
        const start = parseIcsDate(temp.DTSTART || temp['DTSTART;VALUE=DATE'] || '');
        const end = parseIcsDate(temp.DTEND || temp['DTEND;VALUE=DATE'] || start);
        const location = unescapeIcs(temp.LOCATION || '');
        const description = unescapeIcs(temp.DESCRIPTION || '');
        const url = temp.URL || ((description.match(/https?:\/\/\S+/) || [])[0] || '');
        const rr = parseRRule(temp.RRULE);

        parsed.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          title,
          categoryId: defaultCategoryId,
          start,
          end,
          recurrence: rr.recurrence,
          recurrenceInterval: rr.recurrenceInterval,
          recurrenceUntil: rr.recurrenceUntil || null,
          location,
          meetingUrl: url,
          notes: description,
          sourceId,
        });
      }
      inEvent = false;
      continue;
    }

    if (inEvent && line.includes(':')) {
      const idx = line.indexOf(':');
      const key = line.slice(0, idx).toUpperCase();
      const value = line.slice(idx + 1);
      temp[key] = value;
    }
  }

  return parsed;
}

function parseJSONSafe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function CalendarView() {
  const [categories, setCategories] = useState<CalendarCategory[]>(() => loadJSON(CATEGORY_KEY, DEFAULT_CATEGORIES));
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadJSON(EVENTS_KEY, []));
  const [services, setServices] = useState<CalendarService[]>(() => loadJSON(SERVICES_KEY, DEFAULT_SERVICES));
  const [feeds, setFeeds] = useState<SyncFeed[]>(() => loadJSON(FEEDS_KEY, []));

  const icsImportRef = useRef<HTMLInputElement>(null);

  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthState | null>(() => loadJSON<GoogleAuthState | null>(GOOGLE_AUTH_KEY, null));
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSyncMeta, setGoogleSyncMeta] = useState<{ lastSyncedAt?: string }>(() => loadJSON(GOOGLE_SYNC_META_KEY, {}));

  const [newCategory, setNewCategory] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#334155');

  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceUrl, setNewServiceUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  const googleTokenClientRef = useRef<any>(null);
  const googleScriptLoadedRef = useRef(false);

  const [form, setForm] = useState({
    title: '',
    categoryId: 'work',
    startDate: toDateInputValue(new Date()),
    startTime: '09:00',
    endDate: toDateInputValue(new Date()),
    endTime: '10:00',
    recurrence: 'none' as CalendarEvent['recurrence'],
    recurrenceInterval: 1,
    recurrenceUntil: '',
    location: '',
    meetingUrl: '',
    notes: '',
  });

  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const lastDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const monthCells = useMemo(() => {
    const cells: Array<{ date: string | null; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      cells.push({ date: toDateInputValue(date), isCurrentMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, isCurrentMonth: false });
    }
    return cells;
  }, [monthCursor, startOffset, daysInMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = toDateInputValue(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day));
      const list = events.filter((ev) => occursOnDate(ev, date));
      map.set(date, list);
    }
    map.forEach((list) => {
      list.sort((a, b) => a.start.localeCompare(b.start));
    });
    return map;
  }, [events, monthCursor, daysInMonth]);

  const selectedEvents = eventsByDay.get(selectedDate) || [];

  const categoryById = useMemo(() => {
    const map = new Map<string, CalendarCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const persistCategories = (next: CalendarCategory[]) => {
    setCategories(next);
    saveJSON(CATEGORY_KEY, next);
  };

  const persistEvents = (next: CalendarEvent[]) => {
    setEvents(next);
    saveJSON(EVENTS_KEY, next);
  };

  const persistServices = (next: CalendarService[]) => {
    setServices(next);
    saveJSON(SERVICES_KEY, next);
  };

  const persistFeeds = (next: SyncFeed[]) => {
    setFeeds(next);
    saveJSON(FEEDS_KEY, next);
  };

  const persistGoogleAuth = (next: GoogleAuthState | null) => {
    setGoogleAuth(next);
    saveJSON(GOOGLE_AUTH_KEY, next);
  };

  const persistGoogleSyncMeta = (next: { lastSyncedAt?: string }) => {
    setGoogleSyncMeta(next);
    saveJSON(GOOGLE_SYNC_META_KEY, next);
  };

  const isGoogleTokenValid = (state: GoogleAuthState | null) => {
    if (!state) return false;
    return state.expiresAt > Date.now() + 30_000;
  };

  const convertGoogleEvents = (items: any[]): CalendarEvent[] => {
    return items
      .filter((item) => item?.start?.dateTime || item?.start?.date)
      .map((item) => {
        const startRaw = item.start.dateTime || `${item.start.date}T09:00:00`;
        const endRaw = item.end?.dateTime || `${item.end?.date || item.start.date}T10:00:00`;
        const start = new Date(startRaw).toISOString().slice(0, 19);
        const end = new Date(endRaw).toISOString().slice(0, 19);
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
          categoryId: categories[0]?.id || 'work',
          start,
          end,
          recurrence: parsedRule.recurrence,
          recurrenceInterval: parsedRule.recurrenceInterval,
          recurrenceUntil: parsedRule.recurrenceUntil || null,
          location: item.location || '',
          meetingUrl: meetingUrl || '',
          notes,
          sourceId: GOOGLE_CALENDAR_SOURCE_ID,
        } as CalendarEvent;
      });
  };

  const syncGoogleCalendar = async (tokenOverride?: string) => {
    const token = tokenOverride || googleAuth?.accessToken;
    if (!token) return;
    try {
      setGoogleSyncing(true);
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
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            persistGoogleAuth(null);
            setSyncMessage('Google Verbindung abgelaufen. Bitte erneut verbinden.');
            return;
          }
          throw new Error('Google Kalender konnte nicht synchronisiert werden');
        }

        const payload = await response.json();
        allItems.push(...(payload.items || []));
        if (!payload.nextPageToken) break;
        pageToken = payload.nextPageToken;
      }

      const imported = convertGoogleEvents(allItems);
      mergeImportedEvents(imported, GOOGLE_CALENDAR_SOURCE_ID);
      const nextMeta = { lastSyncedAt: new Date().toISOString() };
      persistGoogleSyncMeta(nextMeta);
      setSyncMessage(`Google Sync erfolgreich: ${imported.length} Termine importiert.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Sync fehlgeschlagen';
      setSyncMessage(message);
    } finally {
      setGoogleSyncing(false);
    }
  };

  const connectGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      setSyncMessage('NEXT_PUBLIC_GOOGLE_CLIENT_ID fehlt. Bitte in frontend/.env.local setzen.');
      return;
    }
    if (!googleTokenClientRef.current) {
      setSyncMessage('Google SDK noch nicht geladen. Bitte kurz warten.');
      return;
    }
    googleTokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  };

  const disconnectGoogle = async () => {
    const token = googleAuth?.accessToken;
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        // ignore revoke failures
      }
    }
    persistGoogleAuth(null);
    persistEvents(events.filter((ev) => ev.sourceId !== GOOGLE_CALENDAR_SOURCE_ID));
    setSyncMessage('Google Kalender wurde getrennt.');
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const next = [...categories, { id, name, color: newCategoryColor }];
    persistCategories(next);
    setNewCategory('');
  };

  const removeCategory = (id: string) => {
    const nextCategories = categories.filter((c) => c.id !== id);
    persistCategories(nextCategories);
    const fallback = nextCategories[0]?.id || 'work';
    const nextEvents = events.map((ev) => (ev.categoryId === id ? { ...ev, categoryId: fallback } : ev));
    persistEvents(nextEvents);
  };

  const addService = () => {
    const name = newServiceName.trim();
    const url = newServiceUrl.trim();
    if (!name || !url) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const next = [...services, { id: `${Date.now()}`, name, url: normalized }];
    persistServices(next);
    setNewServiceName('');
    setNewServiceUrl('');
  };

  const removeService = (id: string) => {
    persistServices(services.filter((s) => s.id !== id));
  };

  const resetForm = () => {
    const today = toDateInputValue(new Date());
    setForm({
      title: '',
      categoryId: categories[0]?.id || 'work',
      startDate: today,
      startTime: '09:00',
      endDate: today,
      endTime: '10:00',
      recurrence: 'none',
      recurrenceInterval: 1,
      recurrenceUntil: '',
      location: '',
      meetingUrl: '',
      notes: '',
    });
    setEditingEventId(null);
  };

  const createOrUpdateEvent = () => {
    const title = form.title.trim();
    if (!title) return;

    const start = `${form.startDate}T${form.startTime}:00`;
    const end = `${form.endDate}T${form.endTime}:00`;

    const ev: CalendarEvent = {
      id: editingEventId || `${Date.now()}`,
      title,
      categoryId: form.categoryId,
      start,
      end,
      recurrence: form.recurrence,
      recurrenceInterval: Math.max(1, Number(form.recurrenceInterval) || 1),
      recurrenceUntil: form.recurrence !== 'none' && form.recurrenceUntil ? form.recurrenceUntil : null,
      location: form.location.trim(),
      meetingUrl: form.meetingUrl.trim(),
      notes: form.notes.trim(),
    };

    const next = editingEventId ? events.map((item) => (item.id === editingEventId ? { ...item, ...ev } : item)) : [...events, ev];
    persistEvents(next);
    setSelectedDate(form.startDate);
    resetForm();
  };

  const editEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id);
    setSelectedDate(ev.start.slice(0, 10));
    setForm({
      title: ev.title,
      categoryId: ev.categoryId,
      startDate: ev.start.slice(0, 10),
      startTime: ev.start.slice(11, 16),
      endDate: ev.end.slice(0, 10),
      endTime: ev.end.slice(11, 16),
      recurrence: ev.recurrence || 'none',
      recurrenceInterval: ev.recurrenceInterval || 1,
      recurrenceUntil: ev.recurrenceUntil || '',
      location: ev.location,
      meetingUrl: ev.meetingUrl,
      notes: ev.notes,
    });
  };

  const deleteEvent = (id: string) => {
    persistEvents(events.filter((e) => e.id !== id));
    if (editingEventId === id) {
      resetForm();
    }
  };

  const openGoogleEvent = (ev: CalendarEvent) => {
    const text = encodeURIComponent(ev.title);
    const details = encodeURIComponent(ev.notes || 'Erstellt in Synora Kalender');
    const location = encodeURIComponent(ev.location || '');
    const dates = `${dateTimeToIcs(ev.start)}/${dateTimeToIcs(ev.end)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportIcs = () => {
    const rows = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Synora//Calendar//DE',
      ...events.flatMap((ev) => {
        const category = categoryById.get(ev.categoryId)?.name || 'Allgemein';
        return [
          'BEGIN:VEVENT',
          `UID:${ev.id}@synora.local`,
          `DTSTAMP:${dateTimeToIcs(new Date().toISOString())}`,
          `DTSTART:${dateTimeToIcs(ev.start)}`,
          `DTEND:${dateTimeToIcs(ev.end)}`,
          `SUMMARY:${escapeIcs(ev.title)}`,
          `CATEGORIES:${escapeIcs(category)}`,
          `LOCATION:${escapeIcs(ev.location || '')}`,
          `DESCRIPTION:${escapeIcs(ev.notes || '')}`,
          ...(ev.recurrence !== 'none'
            ? [
                `RRULE:FREQ=${ev.recurrence.toUpperCase()};INTERVAL=${Math.max(1, ev.recurrenceInterval || 1)}${
                  ev.recurrenceUntil ? `;UNTIL=${dateTimeToIcs(`${ev.recurrenceUntil}T23:59:59`)}` : ''
                }`,
              ]
            : []),
          ...(ev.meetingUrl ? [`URL:${escapeIcs(ev.meetingUrl)}`] : []),
          'END:VEVENT',
        ];
      }),
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([rows], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synora-calendar-${Date.now()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mergeImportedEvents = (incoming: CalendarEvent[], sourceId?: string) => {
    if (!incoming.length) return;
    const baseEvents = sourceId ? events.filter((ev) => ev.sourceId !== sourceId) : events;
    const seen = new Set(baseEvents.map((ev) => eventFingerprint(ev)));
    const filtered = incoming.filter((ev) => {
      const fp = eventFingerprint(ev);
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
    persistEvents([...baseEvents, ...filtered]);
  };

  const importIcsFile = async (file: File) => {
    const text = await file.text();
    const imported = parseIcsEvents(text, categories[0]?.id || 'work');
    mergeImportedEvents(imported);
    setSyncMessage(`${imported.length} Termine aus ICS importiert.`);
  };

  const addFeed = () => {
    const name = newFeedName.trim();
    const url = newFeedUrl.trim();
    if (!name || !url) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const next = [...feeds, { id: `${Date.now()}`, name, url: normalized }];
    persistFeeds(next);
    setNewFeedName('');
    setNewFeedUrl('');
  };

  const removeFeed = (id: string) => {
    persistFeeds(feeds.filter((f) => f.id !== id));
    persistEvents(events.filter((ev) => ev.sourceId !== id));
  };

  const syncFeed = async (feed: SyncFeed) => {
    try {
      setSyncMessage(`Synchronisiere ${feed.name}...`);
      const res = await fetch(feed.url);
      if (!res.ok) throw new Error('Feed konnte nicht geladen werden');
      const text = await res.text();
      const imported = parseIcsEvents(text, categories[0]?.id || 'work', feed.id);
      mergeImportedEvents(imported, feed.id);
      const nextFeeds = feeds.map((f) => (f.id === feed.id ? { ...f, lastSyncedAt: new Date().toISOString() } : f));
      persistFeeds(nextFeeds);
      setSyncMessage(`${feed.name}: ${imported.length} Termine synchronisiert.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Synchronisierung fehlgeschlagen';
      setSyncMessage(`${feed.name}: ${msg}. Falls CORS blockiert ist, nutze ICS-Dateiimport.`);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (googleScriptLoadedRef.current) return;

    const existing = document.querySelector('script[data-google-gis="true"]') as HTMLScriptElement | null;
    if (existing && window.google?.accounts?.oauth2) {
      googleScriptLoadedRef.current = true;
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: (response: any) => {
          if (!response?.access_token) return;
          const expiresIn = Number(response.expires_in || 3600);
          const authState: GoogleAuthState = {
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
            connectedAt: new Date().toISOString(),
          };
          persistGoogleAuth(authState);
          void syncGoogleCalendar(response.access_token);
        },
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = 'true';
    script.onload = () => {
      if (!window.google?.accounts?.oauth2) return;
      googleScriptLoadedRef.current = true;
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: (response: any) => {
          if (!response?.access_token) return;
          const expiresIn = Number(response.expires_in || 3600);
          const authState: GoogleAuthState = {
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
            connectedAt: new Date().toISOString(),
          };
          persistGoogleAuth(authState);
          void syncGoogleCalendar(response.access_token);
        },
      });
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleAuth) return;
    if (!isGoogleTokenValid(googleAuth)) {
      persistGoogleAuth(null);
      setSyncMessage('Google Verbindung abgelaufen. Bitte erneut verbinden.');
      return;
    }
    void syncGoogleCalendar();

    const interval = window.setInterval(() => {
      if (isGoogleTokenValid(googleAuth)) {
        void syncGoogleCalendar();
      }
    }, 10 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [googleAuth?.accessToken, googleAuth?.expiresAt]);

  useEffect(() => {
    const handleEventsUpdated = () => {
      setEvents(loadJSON(EVENTS_KEY, []));
    };

    window.addEventListener('calendarEventsUpdated', handleEventsUpdated);
    return () => {
      window.removeEventListener('calendarEventsUpdated', handleEventsUpdated);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="ui-surface-strong rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Kalender</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Modern, ubersichtlich und mit ICS-Import, Wiederholung und Bearbeitung.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="ui-button-ghost rounded-lg px-3 py-2">
              <ChevronLeft size={16} />
            </button>
            <div className="ui-surface rounded-lg px-4 py-2 min-w-44 text-center text-sm font-medium text-slate-800 dark:text-slate-200">
              {monthCursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="ui-button-ghost rounded-lg px-3 py-2">
              <ChevronRight size={16} />
            </button>
            <button onClick={exportIcs} className="ui-button-primary rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2">
              <CalendarDays size={16} />
              ICS Export
            </button>
            <button onClick={() => icsImportRef.current?.click()} className="ui-button-ghost rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2">
              <Upload size={16} />
              ICS Import
            </button>
            <input
              ref={icsImportRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await importIcsFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {syncMessage && <div className="ui-surface rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{syncMessage}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 ui-surface rounded-2xl p-4">
            <div className="grid grid-cols-7 gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                <div key={d} className="px-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((cell, idx) => {
                if (!cell.date) {
                  return <div key={`empty-${idx}`} className="h-24 rounded-lg border border-transparent" />;
                }
                const dayEvents = eventsByDay.get(cell.date) || [];
                const active = selectedDate === cell.date;
                return (
                  <button
                    key={cell.date}
                    onClick={() => {
                      setSelectedDate(cell.date as string);
                      setForm((prev) => ({ ...prev, startDate: cell.date as string, endDate: cell.date as string }));
                    }}
                    className={`h-24 rounded-xl border p-2 text-left transition-colors ${
                      active
                        ? 'border-slate-500 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'border-white/45 dark:border-slate-700/45 hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1">{Number(cell.date.slice(8, 10))}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const category = categoryById.get(ev.categoryId);
                        return (
                          <div key={ev.id} className="text-[11px] truncate px-1.5 py-0.5 rounded" style={{ backgroundColor: category?.color || '#334155', color: '#fff' }}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && <div className="text-[11px] opacity-70">+{dayEvents.length - 2} mehr</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="ui-surface rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                {editingEventId ? 'Termin bearbeiten' : 'Termin erstellen'}
              </h2>
              <div className="space-y-2">
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Titel"
                  className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                  <input type="time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                  <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                  <input type="time" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm((prev) => ({ ...prev, recurrence: e.target.value as CalendarEvent['recurrence'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                  >
                    <option value="none">Keine Wiederholung</option>
                    <option value="daily">Taeglich</option>
                    <option value="weekly">Woechentlich</option>
                    <option value="monthly">Monatlich</option>
                    <option value="yearly">Jaehrlich</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={form.recurrenceInterval}
                    onChange={(e) => setForm((prev) => ({ ...prev, recurrenceInterval: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                    placeholder="Intervall"
                  />
                </div>
                {form.recurrence !== 'none' && (
                  <input
                    type="date"
                    value={form.recurrenceUntil}
                    onChange={(e) => setForm((prev) => ({ ...prev, recurrenceUntil: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                  />
                )}
                <select value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm ui-input">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Ort"
                  className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                />
                <input
                  value={form.meetingUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, meetingUrl: e.target.value }))}
                  placeholder="Meeting-Link (https://...)"
                  className="w-full px-3 py-2 rounded-lg text-sm ui-input"
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notizen"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm ui-input resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={createOrUpdateEvent} className="w-full ui-button-primary rounded-lg py-2 text-sm font-medium inline-flex items-center justify-center gap-2">
                    {editingEventId ? <Save size={16} /> : <Plus size={16} />}
                    {editingEventId ? 'Termin aktualisieren' : 'Termin speichern'}
                  </button>
                  {editingEventId && (
                    <button onClick={resetForm} className="w-full ui-button-ghost rounded-lg py-2 text-sm font-medium inline-flex items-center justify-center gap-2">
                      <X size={16} />
                      Abbrechen
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="ui-surface rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Kategorien</h2>
              <div className="space-y-2 mb-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-white/45 dark:bg-slate-800/45 border border-white/45 dark:border-slate-700/45">
                    <div className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                    {categories.length > 1 && (
                      <button onClick={() => removeCategory(cat.id)} className="text-slate-500 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Neue Kategorie" className="px-3 py-2 rounded-lg text-sm ui-input" />
                <input type="color" value={newCategoryColor} onChange={(e) => setNewCategoryColor(e.target.value)} className="h-10 w-10 rounded-lg border border-white/45 dark:border-slate-700/45 bg-transparent" />
                <button onClick={addCategory} className="ui-button-ghost rounded-lg px-3">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="ui-surface rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Kalenderdienste verbinden</h2>
              <div className="space-y-2 mb-3">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-white/45 dark:bg-slate-800/45 border border-white/45 dark:border-slate-700/45">
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate pr-2">{s.name}</span>
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => window.open(s.url, '_blank', 'noopener,noreferrer')} className="p-1.5 ui-button-ghost rounded-md border-transparent">
                        <ExternalLink size={14} />
                      </button>
                      {!['google', 'notion', 'outlook', 'apple'].includes(s.id) && (
                        <button onClick={() => removeService(s.id)} className="p-1.5 text-slate-500 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Dienstname" className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                <input value={newServiceUrl} onChange={(e) => setNewServiceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                <button onClick={addService} className="w-full ui-button-ghost rounded-lg px-3 py-2 text-sm inline-flex items-center justify-center gap-2">
                  <Link2 size={15} />
                  Verbindung speichern
                </button>
              </div>
            </div>

            <div className="ui-surface rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">ICS Feed Sync</h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Google-Account-Verbindung und Auto-Sync findest du in den Einstellungen. Hier kannst du zusaetzlich ICS-Feeds (z. B. private Google iCal URL oder Notion-Feeds) verknuepfen.
              </p>
              <div className="space-y-2 mb-3">
                {feeds.map((feed) => (
                  <div key={feed.id} className="rounded-lg border border-white/45 dark:border-slate-700/45 bg-white/45 dark:bg-slate-800/45 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{feed.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{feed.url}</p>
                        {feed.lastSyncedAt && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Letzter Sync: {new Date(feed.lastSyncedAt).toLocaleString('de-DE')}</p>
                        )}
                      </div>
                      <div className="inline-flex gap-1">
                        <button onClick={() => syncFeed(feed)} className="ui-button-ghost rounded-md px-2 py-1 text-xs inline-flex items-center gap-1">
                          <RefreshCw size={12} /> Sync
                        </button>
                        <button onClick={() => removeFeed(feed.id)} className="text-slate-500 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input value={newFeedName} onChange={(e) => setNewFeedName(e.target.value)} placeholder="Feed Name (z. B. Google privat)" className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                <input value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} placeholder="ICS Feed URL (https://...)" className="w-full px-3 py-2 rounded-lg text-sm ui-input" />
                <button onClick={addFeed} className="w-full ui-button-ghost rounded-lg px-3 py-2 text-sm inline-flex items-center justify-center gap-2">
                  <Link2 size={15} /> Feed verknuepfen
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank', 'noopener,noreferrer')}
                  className="ui-button-ghost rounded-lg px-3 py-2 text-xs"
                >
                  Google Import/Export
                </button>
                <button
                  onClick={() => window.open('https://calendar.notion.so/', '_blank', 'noopener,noreferrer')}
                  className="ui-button-ghost rounded-lg px-3 py-2 text-xs"
                >
                  Notion Calendar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Termine am {new Date(selectedDate).toLocaleDateString('de-DE')}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{selectedEvents.length} Eintrage</span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Keine Termine fur diesen Tag.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => {
                const category = categoryById.get(ev.categoryId);
                return (
                  <div key={ev.id} className="rounded-xl border border-white/45 dark:border-slate-700/45 bg-white/45 dark:bg-slate-800/45 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category?.color || '#334155' }} />
                          {ev.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(ev.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {ev.recurrence !== 'none' && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Wiederholung: {ev.recurrence} / alle {ev.recurrenceInterval}
                            {ev.recurrenceUntil ? ` bis ${new Date(`${ev.recurrenceUntil}T00:00:00`).toLocaleDateString('de-DE')}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => editEvent(ev)} className="text-slate-500 hover:text-sky-600" title="Bearbeiten">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => deleteEvent(ev.id)} className="text-slate-500 hover:text-red-500" title="Loeschen">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ev.location && (
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`, '_blank', 'noopener,noreferrer')}
                          className="ui-button-ghost rounded-md px-2 py-1 text-xs inline-flex items-center gap-1"
                        >
                          <MapPin size={13} /> Ort offnen
                        </button>
                      )}
                      {ev.meetingUrl && (
                        <button
                          onClick={() => window.open(ev.meetingUrl, '_blank', 'noopener,noreferrer')}
                          className="ui-button-ghost rounded-md px-2 py-1 text-xs inline-flex items-center gap-1"
                        >
                          <Video size={13} /> Meeting offnen
                        </button>
                      )}
                      <button onClick={() => openGoogleEvent(ev)} className="ui-button-ghost rounded-md px-2 py-1 text-xs inline-flex items-center gap-1">
                        <ExternalLink size={13} /> In Google vorbereiten
                      </button>
                    </div>
                    {ev.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ev.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="ui-surface rounded-xl p-3 inline-flex items-center gap-2"><Briefcase size={14} /> Kategorien wie Arbeit/Privat frei anlegbar</div>
          <div className="ui-surface rounded-xl p-3 inline-flex items-center gap-2"><Home size={14} /> Ort speichern, Meeting-Link oeffnen und Termin bearbeiten</div>
          <div className="ui-surface rounded-xl p-3 inline-flex items-center gap-2"><Tag size={14} /> ICS Import/Export + Feed-Sync fuer Google/Notion</div>
        </div>
      </div>
    </div>
  );
}
