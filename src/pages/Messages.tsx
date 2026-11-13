import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Paper, TextField, Typography, useMediaQuery } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';
import { DEMO_VENUES, type VenuePerson } from '../data/venues';
import { loadFriends } from '../utils/friends';
import { liveAiStatus, type LiveAiStatus } from '../utils/liveAi';
import { elementColor, elementEmoji, resolveNavitarArt } from '../utils/navitarArt';
import {
  REPLY_DELAY_MS,
  appendMessage,
  ensureNavitarThread,
  ensurePersonThread,
  getThread,
  getThreadReply,
  loadThreads,
  sortThreadsByRecent,
  type Thread,
  type ThreadMessage,
} from '../utils/threads';
import { NavitarArtImg } from '../components/NavitarArtImg';

// Messages page — the thread list and the chat view for every thread in
// the store (src/utils/threads.ts). Local-only: person threads are with
// the demo people met on the Realm Map, the navitar thread is with the
// player's own navitar. There is no server and no real user on the other
// end; replies come from the scripted banks, or DeepSeek when Live AI
// is ON with a key — always through getThreadReply, never a direct
// DeepSeek call from this page.

const REPLY_MODE_CAPTION: Record<LiveAiStatus, string> = {
  off: 'Replies are scripted — Live AI is off.',
  'on-no-key': 'Live AI is on but no DeepSeek key is configured — replies are scripted.',
  ready: 'Live AI is on — replies come from DeepSeek.',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// A demo person, resolved against DEMO_VENUES by person id — the same
// resolution Profile uses for its friends list.
function findPerson(personId: string): VenuePerson | null {
  for (const venue of DEMO_VENUES) {
    const person = venue.people.find(p => p.id === personId);
    if (person) return person;
  }
  return null;
}

// Avatar for a thread or friend row: the navitar art when it resolves,
// otherwise the element emoji in an element-coloured circle — the same
// pattern as Profile's friend cards.
function ThreadAvatar({
  title,
  navitarName,
  navitarImage,
  element,
  size,
}: {
  title: string;
  navitarName?: string;
  navitarImage?: string;
  element?: string;
  size: number;
}) {
  const art = resolveNavitarArt(navitarImage, navitarName ?? title);
  if (art) {
    return (
      <NavitarArtImg
        src={art}
        alt={`${title} art`}
        element={element ?? 'ice'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `2px solid ${elementColor(element ?? 'ice')}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${elementColor(element ?? 'ice')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        flexShrink: 0,
      }}
    >
      {elementEmoji(element ?? 'ice')}
    </Box>
  );
}

// One row of the thread list: either a real thread, or a friend with no
// thread yet (opening it says hello first — no history is fabricated).
interface ListRow {
  key: string;
  threadId: string | null;
  person: VenuePerson | null;
  title: string;
  subtitle: string;
  navitarName?: string;
  navitarImage?: string;
  element?: string;
  preview: string;
  previewTs: number | null;
  sayHello: boolean;
}

const Messages: React.FC = () => {
  const { userNavitar } = useNavitarFightClub();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width:900px)');
  const [threads, setThreads] = useState<Thread[]>(() => sortThreadsByRecent(loadThreads()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingThreadId, setTypingThreadId] = useState<string | null>(null);
  const [liveAiUnavailable, setLiveAiUnavailable] = useState(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  // The reply-mode caption is read at render; the toggle lives on
  // Profile, so it cannot change while this page is open.
  const replyMode = liveAiStatus();

  const refreshThreads = () => setThreads(sortThreadsByRecent(loadThreads()));

  // Mount: the navitar always has a thread row, the list reflects the
  // store, and a ?thread=<id> deep-link selects that thread when it
  // exists. A deep-link naming a thread that does not exist yet is
  // ignored, not a crash.
  useEffect(() => {
    if (userNavitar) {
      ensureNavitarThread({
        id: userNavitar.id,
        name: userNavitar.name,
        element: userNavitar.element,
        imageUrl: userNavitar.imageUrl,
      });
    }
    refreshThreads();
    const deepLinkId = searchParams.get('thread');
    if (deepLinkId && getThread(deepLinkId)) {
      setSelectedId(deepLinkId);
      setMessages(getThread(deepLinkId)?.messages ?? []);
    }
    // Mount-only on purpose: the navitar thread is seeded once, and
    // the deep-link is read once. (No eslint-disable here: this repo's
    // config has no eslint-plugin-react-hooks, so naming the rule
    // errors the build.)
  }, []);

  // Guard the delayed reply against unmount — no setState after the
  // page is gone, and the pending timeout is cleared.
  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  // Auto-scroll the open thread to the bottom when a message arrives.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Friends (resolved against DEMO_VENUES, like Profile) with no thread
  // yet — they still get a row, with a "Say hello" preview.
  const friendRows: ListRow[] = useMemo(() => {
    const threadPersonIds = new Set(
      threads.filter(t => t.kind === 'person' && t.personId).map(t => t.personId as string)
    );
    return loadFriends()
      .map((personId): VenuePerson | null => findPerson(personId))
      .filter((p): p is VenuePerson => p !== null)
      .filter(p => !threadPersonIds.has(p.id))
      .map((person): ListRow => ({
        key: `friend-${person.id}`,
        threadId: null,
        person,
        title: person.name,
        subtitle: `${person.navitarName} · Lv. ${person.navitarLevel} · ${person.navitarElement}`,
        navitarName: person.navitarName,
        navitarImage: person.navitarImage,
        element: person.navitarElement,
        preview: 'Say hello',
        previewTs: null,
        sayHello: true,
      }));
  }, [threads]);

  const threadRows: ListRow[] = useMemo(
    () =>
      threads.map((thread): ListRow => {
        const person = thread.personId ? findPerson(thread.personId) : null;
        const last = thread.messages[thread.messages.length - 1];
        return {
          key: thread.id,
          threadId: thread.id,
          person,
          title: thread.title,
          subtitle: thread.subtitle,
          navitarName:
            person?.navitarName ?? (thread.kind === 'navitar' ? thread.title : undefined),
          navitarImage: thread.navitarImage,
          element: thread.element,
          preview: last ? last.text : 'Say hello',
          previewTs: last ? last.ts : null,
          sayHello: thread.messages.length === 0,
        };
      }),
    [threads]
  );

  const rows = [...threadRows, ...friendRows];
  const selectedThread = threads.find(t => t.id === selectedId) ?? null;
  const hasAnything = rows.length > 0 || !!userNavitar;

  const openRow = (row: ListRow) => {
    // A friend with no thread yet gets an empty one on open — the
    // player says hello first, and the person's first reply comes from
    // their scripted bank.
    const id = row.threadId ?? (row.person ? ensurePersonThread(row.person) : null);
    if (!id) return;
    refreshThreads();
    setSelectedId(id);
    // Keep the URL in sync with the open thread (replace, so the
    // browser Back button doesn't cycle through threads): a reload
    // then lands on the thread the player is looking at, via the
    // ?thread=<id> deep-link read on mount.
    setSearchParams({ thread: id }, { replace: true });
    setMessages(getThread(id)?.messages ?? []);
    setLiveAiUnavailable(false);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || typingThreadId !== null || !selectedThread) return;
    const threadId = selectedThread.id;
    const updated = appendMessage(threadId, { from: 'you', text, ts: Date.now() });
    if (!updated) return;
    // The store is the source of truth — take its messages as new state.
    setMessages(updated.messages);
    setInput('');
    setTypingThreadId(threadId);
    setLiveAiUnavailable(false);
    refreshThreads();
    timeoutRef.current = window.setTimeout(async () => {
      const reply = await getThreadReply(updated, text);
      if (!mountedRef.current) return;
      const after = appendMessage(threadId, { from: 'them', text: reply.text, ts: Date.now() });
      if (!mountedRef.current) return;
      if (after) setMessages(after.messages);
      setLiveAiUnavailable(reply.liveAiUnavailable);
      setTypingThreadId(null);
      refreshThreads();
    }, REPLY_DELAY_MS);
  };

  const threadList = (
    <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Messages
      </Typography>
      {rows.length === 0 ? (
        <Typography color="text.secondary">
          No messages yet — meet someone on the Realm Map (answer an icebreaker) or create a
          navitar, and their thread will show up here.
        </Typography>
      ) : (
        rows.map(row => (
          <Box
            key={row.key}
            onClick={() => openRow(row)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1.5,
              borderRadius: 1,
              cursor: 'pointer',
              bgcolor: row.threadId === selectedId ? 'rgba(33,150,243,0.12)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(33,150,243,0.08)' },
            }}
          >
            <ThreadAvatar
              title={row.title}
              navitarName={row.navitarName}
              navitarImage={row.navitarImage}
              element={row.element}
              size={56}
            />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle1" noWrap>
                {row.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {row.subtitle}
              </Typography>
              <Typography
                variant="body2"
                color={row.sayHello ? 'primary' : 'text.secondary'}
                noWrap
              >
                {row.sayHello ? 'Say hello' : row.preview}
                {row.previewTs !== null && ` · ${formatTime(row.previewTs)}`}
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );

  const threadView = selectedThread ? (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
        {!isDesktop && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSelectedId(null);
              // Back to the thread list — clear the param so a reload
              // shows the list, not the thread just left.
              setSearchParams({}, { replace: true });
            }}
          >
            Back
          </Button>
        )}
        <ThreadAvatar
          title={selectedThread.title}
          navitarName={
            selectedThread.personId
              ? findPerson(selectedThread.personId)?.navitarName
              : selectedThread.kind === 'navitar'
                ? selectedThread.title
                : undefined
          }
          navitarImage={selectedThread.navitarImage}
          element={selectedThread.element}
          size={48}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {selectedThread.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {selectedThread.subtitle}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {REPLY_MODE_CAPTION[replyMode]}
      </Typography>

      <Box
        ref={messagesRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          py: 1,
        }}
      >
        {messages.map((msg, idx) => (
          <Box
            key={`${msg.ts}-${idx}`}
            sx={{ display: 'flex', justifyContent: msg.from === 'you' ? 'flex-end' : 'flex-start' }}
          >
            <Box sx={{ maxWidth: '75%' }}>
              {msg.from === 'them' && (
                <Typography variant="caption" color="text.secondary">
                  {selectedThread.title}
                </Typography>
              )}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: msg.from === 'you' ? '#2196f3' : 'background.paper',
                  border: msg.from === 'them' ? '1px solid rgba(255,255,255,0.12)' : undefined,
                }}
              >
                <Typography variant="body1">{msg.text}</Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: msg.from === 'you' ? 'right' : 'left' }}
              >
                {formatTime(msg.ts)}
              </Typography>
            </Box>
          </Box>
        ))}
        {typingThreadId === selectedThread.id && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                typing…
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {liveAiUnavailable && (
        <Typography variant="caption" color="warning.main" sx={{ mb: 0.5 }}>
          Live AI is unavailable right now — answering from scripted lines.
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Message ${selectedThread.title}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={typingThreadId !== null || input.trim() === ''}
        >
          Send
        </Button>
      </Box>
    </Paper>
  ) : (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography color="text.secondary">
        Pick a thread to start chatting — or meet someone new on the Realm Map.
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>
      {!hasAnything ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No messages yet — meet someone on the Realm Map (answer an icebreaker) or create a
            navitar, and their thread will show up here.
          </Typography>
        </Paper>
      ) : isDesktop ? (
        <Box sx={{ display: 'flex', gap: 2, height: '70vh' }}>
          <Box sx={{ width: '33%', flexShrink: 0 }}>{threadList}</Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>{threadView}</Box>
        </Box>
      ) : (
        <Box sx={{ height: '70vh' }}>{selectedId ? threadView : threadList}</Box>
      )}
    </Box>
  );
};

export default Messages;
