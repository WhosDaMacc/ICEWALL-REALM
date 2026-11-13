// Message threads — the chat store for the Messages page and for
// NavitarChat on Profile. One thread per person met and one thread per
// navitar the player owns; one thread is the source of truth, so the
// Messages page and the Profile chat can never disagree.
//
// Local-only: threads live in localStorage (icewall-threads) and survive
// reloads. There is no server, no other real user on the other end —
// person threads are with the demo people in the game, and the navitar
// thread is with the player's own navitar. Real user-to-user messaging
// needs accounts and backend matchmaking and is a later step.
//
// A person's thread is created the first time they are met (an
// icebreaker answer is picked on the Realm Map): the icebreaker
// exchange — their question, the player's chosen answer, their reply —
// becomes the thread's first three messages. The navitar thread is
// created when it is first opened (Messages page or Profile chat) and
// starts with a greeting in the navitar's voice.
//
// Replies: scripted banks from src/data/replies.ts by default (Live AI
// OFF). When the Live AI toggle is ON and a key is baked into the build,
// getThreadReply asks DeepSeek instead — through the same gated
// askDeepSeek in src/utils/liveAi.ts, so the toggle and the fail-safe
// OFF are unchanged; on any failure it falls back to the scripted bank.

import type { Element as NavitarElement, VenuePerson } from '../data/venues';
import {
  NAVITAR_REPLIES,
  PERSON_CHARACTER,
  PERSON_REPLIES,
  navitarGreeting,
} from '../data/replies';
import { askDeepSeek, liveAiStatus } from './liveAi';

export const THREADS_KEY = 'icewall-threads';
// Pause before the other side answers, so a reply reads as typed, not
// instant. 900ms: present, not sluggish.
export const REPLY_DELAY_MS = 900;

export type ThreadKind = 'person' | 'navitar';

export interface ThreadMessage {
  from: 'you' | 'them';
  text: string;
  ts: number;
}

export interface Thread {
  id: string;
  kind: ThreadKind;
  title: string;
  subtitle: string;
  personId?: string;
  navitarImage?: string;
  element?: string;
  messages: ThreadMessage[];
}

export function personThreadId(personId: string): string {
  return `person-${personId}`;
}

// The player's own navitar thread id — LEGACY singleton. Chat history
// used to live in ONE shared thread for whichever navitar was active,
// so switching navitars showed the previous navitar's conversation
// (a fire navitar displaying ice lines — live audit 2026-11-12).
// Threads are now keyed PER NAVITAR (navitarThreadId below); this
// constant remains only so a legacy thread can be adopted by the
// navitar it actually belongs to (see ensureNavitarThread).
export const NAVITAR_THREAD_ID = 'navitar-own';

// One thread per owned navitar, keyed by the navitar's id — the id
// never changes, so the thread follows the navitar for its whole life.
export function navitarThreadId(navitarId: string): string {
  return `navitar-${navitarId}`;
}

export function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Thread =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as Thread).id === 'string' &&
        Array.isArray((t as Thread).messages)
    );
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]): void {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch {
    // Private mode / quota: threads still hold for this session.
  }
}

export function getThread(id: string): Thread | undefined {
  return loadThreads().find(t => t.id === id);
}

function upsertThread(next: Thread): void {
  const threads = loadThreads();
  const idx = threads.findIndex(t => t.id === next.id);
  if (idx >= 0) threads[idx] = next;
  else threads.push(next);
  saveThreads(threads);
}

// Appends a message to a thread and returns the updated thread, or
// undefined when the thread does not exist. Callers that hold their own
// message state (NavitarChat, Messages) should take the returned
// messages as the new state — the store is the source of truth.
export function appendMessage(id: string, message: ThreadMessage): Thread | undefined {
  const thread = getThread(id);
  if (!thread) return undefined;
  const next: Thread = { ...thread, messages: [...thread.messages, message] };
  upsertThread(next);
  return next;
}

// Ensures a person's thread exists without seeding any history: for
// a friend met before threads existed (an icewall-friends entry with no
// thread yet), the Messages list still shows them, and opening the
// thread creates it empty — the player says hello first, and the
// person's first reply comes from their bank. No history is fabricated.
export function ensurePersonThread(person: VenuePerson): string {
  const id = personThreadId(person.id);
  if (getThread(id)) return id;
  upsertThread({
    id,
    kind: 'person',
    title: person.name,
    subtitle: `${person.navitarName} · Lv. ${person.navitarLevel} · ${person.navitarElement}`,
    personId: person.id,
    navitarImage: person.navitarImage,
    element: person.navitarElement,
    messages: [],
  });
  return id;
}

// Seeds a person's thread from their icebreaker exchange. No-op when
// the thread already exists — the first exchange is the opening, and a
// later re-answer does not re-seed it. Returns the thread id.
export function seedPersonThread(
  person: VenuePerson,
  answerLabel: string,
  answerReply: string
): string {
  const id = personThreadId(person.id);
  if (getThread(id)) return id;
  const now = Date.now();
  upsertThread({
    id,
    kind: 'person',
    title: person.name,
    subtitle: `${person.navitarName} · Lv. ${person.navitarLevel} · ${person.navitarElement}`,
    personId: person.id,
    navitarImage: person.navitarImage,
    element: person.navitarElement,
    messages: [
      { from: 'them', text: person.icebreakerQuestion, ts: now },
      { from: 'you', text: answerLabel, ts: now + 1 },
      { from: 'them', text: answerReply, ts: now + 2 },
    ],
  });
  return id;
}

// --- Seeded-name healing -------------------------------------------------
// Seeded navitar lines (the greeting + the scripted reply banks) bake
// the navitar's name into the stored text. When the player later
// adopts a different navitar, those stored lines keep naming the OLD
// one — the thread opened as Quantix but its flavor lines still said
// "Test Wolf gives a cool nod…" (live check 2026-11-12; the round-1
// heal covered only the greeting). A stored message that matches a
// seeded template EXACTLY (modulo the name) is provably a seeded
// line, so the name it was seeded with can be recovered from the
// match and swapped for the current navitar's name. Anything that
// does not match a template exactly — a Live AI reply, anything
// ambiguous — is left untouched, and the player's own messages
// (from: 'you') are never rewritten.
const NAME_SENTINEL = '\u0001NAME\u0001';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let seededLinePatterns: RegExp[] | null = null;
function getSeededLinePatterns(): RegExp[] {
  if (seededLinePatterns) return seededLinePatterns;
  const templates: string[] = [];
  for (const fns of Object.values(NAVITAR_REPLIES)) {
    for (const fn of fns) templates.push(fn(NAME_SENTINEL));
  }
  for (const el of [
    'ice',
    'fire',
    'nature',
    'shadow',
    'light',
    'quantum',
    'electric',
    'spiritual',
    'water',
    'other',
  ]) {
    templates.push(navitarGreeting(el, NAME_SENTINEL));
  }
  seededLinePatterns = templates
    .filter(t => t.includes(NAME_SENTINEL))
    .map(t => new RegExp('^' + t.split(NAME_SENTINEL).map(escapeRegExp).join('(.+?)') + '$'));
  return seededLinePatterns;
}

function healSeededNavitarNames(messages: ThreadMessage[], currentName: string): ThreadMessage[] {
  const patterns = getSeededLinePatterns();
  let changed = false;
  const next = messages.map(m => {
    if (m.from !== 'them') return m;
    for (const re of patterns) {
      const match = re.exec(m.text);
      if (!match) continue;
      const names = match.slice(1);
      const stale = names[0];
      // Every name slot in the line must agree (one bank line names
      // the navitar twice) and must differ from the current name —
      // otherwise this is not a stale seeded line; leave it alone.
      if (!stale || stale === currentName || !names.every(n => n === stale)) return m;
      changed = true;
      return { ...m, text: m.text.split(stale).join(currentName) };
    }
    return m;
  });
  return changed ? next : messages;
}

// Ensures the player's navitar thread exists, creating it with a
// greeting in the navitar's voice when it is new. When it already
// exists the title/art/element are refreshed (a changed look should
// show up in the thread list). Returns the thread id.
//
// PER-NAVITAR (fix, live audit 2026-11-12): the thread is keyed by the
// navitar's id, so every owned navitar has its OWN history — a navitar
// with no history of its own starts with just its greeting, never with
// another navitar's lines. Callers that pass no id (none should, now)
// fall back to the legacy singleton id. A legacy singleton thread is
// adopted by the navitar whose name it carries, the first time that
// navitar ensures its thread — its history moves to the per-navitar
// key instead of being shown to every navitar in turn.
export function ensureNavitarThread(navitar: {
  id?: string;
  name: string;
  element: string;
  imageUrl?: string;
}): string {
  const threadId = navitar.id ? navitarThreadId(navitar.id) : NAVITAR_THREAD_ID;
  let existing = getThread(threadId);
  if (!existing && navitar.id) {
    const legacy = getThread(NAVITAR_THREAD_ID);
    if (legacy && legacy.title === navitar.name) {
      const rest = loadThreads().filter(t => t.id !== NAVITAR_THREAD_ID);
      existing = { ...legacy, id: threadId };
      saveThreads([...rest, existing]);
    }
  }
  if (existing) {
    // Heal ALL seeded lines that name a previous navitar (greeting
    // and flavor lines alike), keeping timestamps. The thread-list
    // preview derives from the last message's text, so healing the
    // messages heals the preview too.
    let messages = healSeededNavitarNames(existing.messages, navitar.name);
    // The greeting also carries the OLD navitar's element flavor
    // ("Cold and ready" from an ice greeting). When the first message
    // is exactly some other element's greeting for the current name,
    // regenerate it in the current navitar's voice (round-1 heal).
    const first = messages[0];
    if (
      first &&
      first.from === 'them' &&
      first.text !== navitarGreeting(navitar.element, navitar.name)
    ) {
      const otherElement = Object.keys(NAVITAR_REPLIES).find(
        el => first.text === navitarGreeting(el, navitar.name)
      );
      if (otherElement && otherElement !== navitar.element) {
        messages = [
          { ...first, text: navitarGreeting(navitar.element, navitar.name) },
          ...messages.slice(1),
        ];
      }
    }
    // imageUrl is optional (NavitarChat has no art to pass) — keep the
    // existing art when none is supplied, instead of wiping it.
    upsertThread({
      ...existing,
      title: navitar.name,
      messages,
      navitarImage: navitar.imageUrl ?? existing.navitarImage,
      element: navitar.element,
    });
    return threadId;
  }
  upsertThread({
    id: threadId,
    kind: 'navitar',
    title: navitar.name,
    subtitle: 'Your navitar',
    navitarImage: navitar.imageUrl,
    element: navitar.element,
    messages: [
      { from: 'them', text: navitarGreeting(navitar.element, navitar.name), ts: Date.now() },
    ],
  });
  return threadId;
}

// Threads sorted newest-first by their last message, for the Messages
// list. Threads with no messages sort last (they should not exist, but
// the sort stays total either way).
export function sortThreadsByRecent(threads: Thread[]): Thread[] {
  const lastTs = (t: Thread): number => t.messages[t.messages.length - 1]?.ts ?? 0;
  return [...threads].sort((a, b) => lastTs(b) - lastTs(a));
}

// Pick a line without repeating the one just used (re-roll once when the
// pool has more than one line). A conversation that answers itself with
// the same line twice in a row reads as broken.
function pickLine(lines: string[], avoid?: string): string {
  if (lines.length === 0) return '...';
  const pool = lines.length > 1 && avoid ? lines.filter(l => l !== avoid) : lines;
  return pool[Math.floor(Math.random() * pool.length)];
}

function scriptedReply(thread: Thread): string {
  const lastThem = [...thread.messages].reverse().find(m => m.from === 'them')?.text;
  if (thread.kind === 'person' && thread.personId) {
    const lines = PERSON_REPLIES[thread.personId] ?? [];
    if (lines.length > 0) return pickLine(lines, lastThem);
    return 'Good talking to you — same time tomorrow?';
  }
  // thread.element is a plain string, so the index is guarded: an
  // unknown element falls back to the generic bank at runtime.
  const fns =
    (thread.element ? NAVITAR_REPLIES[thread.element as NavitarElement | 'generic'] : undefined) ??
    NAVITAR_REPLIES.generic;
  return pickLine(
    fns.map(fn => fn(thread.title)),
    lastThem
  );
}

// The Live AI system prompt for a person thread: who they are, in the
// game's voice. Navitar threads use askDeepSeek's default prompt
// (character = element), so they need no override.
function personSystemPrompt(thread: Thread): string {
  const character = (thread.personId && PERSON_CHARACTER[thread.personId]) || thread.subtitle;
  return (
    `You are ${thread.title}, ${character} in the game ICEWALL-REALM. ` +
    'Answer in character, briefly (one or two sentences), like a friend texting back ' +
    'at a bar, park or beach. If the player mentions a battle, be game for one. ' +
    'Never mention that you are an AI model.'
  );
}

export interface ThreadReply {
  text: string;
  viaLiveAi: boolean;
  // True only when the toggle was ON with a key and the live call
  // failed — the caller shows the "unavailable, scripted instead" line.
  liveAiUnavailable: boolean;
}

// The one reply path for every thread (Messages page + NavitarChat).
// Live AI ON + key: DeepSeek answers (person prompt for people,
// default prompt for the navitar). Anything else — OFF, no key, or a
// failed call — answers from the scripted bank, and a failed live call
// reports liveAiUnavailable so the UI can say so.
export async function getThreadReply(thread: Thread, userText: string): Promise<ThreadReply> {
  if (liveAiStatus() === 'ready') {
    const reply =
      thread.kind === 'person'
        ? await askDeepSeek({
            navitarName: thread.title,
            character: (thread.personId && PERSON_CHARACTER[thread.personId]) || thread.subtitle,
            userMessage: userText,
            system: personSystemPrompt(thread),
          })
        : await askDeepSeek({
            navitarName: thread.title,
            character: thread.element ?? 'ice',
            userMessage: userText,
          });
    if (reply) return { text: reply, viaLiveAi: true, liveAiUnavailable: false };
    return { text: scriptedReply(thread), viaLiveAi: false, liveAiUnavailable: true };
  }
  return { text: scriptedReply(thread), viaLiveAi: false, liveAiUnavailable: false };
}
