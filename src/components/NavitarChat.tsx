import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { liveAiStatus } from '../utils/liveAi';
import {
  NAVITAR_THREAD_ID,
  REPLY_DELAY_MS,
  appendMessage,
  ensureNavitarThread,
  getThread,
  getThreadReply,
  navitarThreadId,
  type ThreadMessage,
} from '../utils/threads';

export const LIVE_AI_OFF_LINE =
  'Live AI is off — your navitar answers from its scripted lines until go-live.';
export const LIVE_AI_NO_KEY_LINE =
  'Live AI is on but no DeepSeek key is configured — add it at build time. Answering from scripted lines for now.';
export const LIVE_AI_UNAVAILABLE_LINE =
  'Live AI is unavailable right now — answering from scripted lines.';

interface NavitarChatProps {
  // id keys the chat history to THIS navitar (per-navitar threads) —
  // without it the chat falls back to the legacy shared thread.
  navitar: { id?: string; name: string; element: string } | null;
  liveAiEnabled: boolean;
}

// Talk to your navitar — the Profile chat IS the navitar's thread, the
// same thread the Messages page shows. The thread store
// (src/utils/threads.ts) is the source of truth: this component holds
// only a local copy of the thread's messages, refreshed from the store
// after every append, so the two views can never disagree. Replies come
// from the per-element banks in src/data/replies.ts via getThreadReply —
// element-tuned, same voice idea as the old generic lines.
//
// The toggle on the Profile page decides what happens when you send:
// - OFF (default): scripted reply only, zero network calls, zero charges.
// - ON + no key: a visible "no key configured" line, scripted reply only.
// - ON + key: the message goes to DeepSeek, reply shown in character;
//   on any failure the scripted line answers instead.
export const NavitarChat: React.FC<NavitarChatProps> = ({ navitar, liveAiEnabled }) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // This navitar's own thread — keyed by its id, so switching the
  // active navitar switches the conversation (never another navitar's
  // history). Falls back to the legacy shared id when no id is passed.
  const threadId = navitar?.id ? navitarThreadId(navitar.id) : NAVITAR_THREAD_ID;

  // On mount (and when the navitar changes), make sure the navitar's
  // thread exists and load its messages from the store — including the
  // greeting and anything said on the Messages page.
  useEffect(() => {
    if (!navitar) return;
    ensureNavitarThread({ id: navitar.id, name: navitar.name, element: navitar.element });
    const thread = getThread(threadId);
    if (thread) setMessages(thread.messages);
  }, [navitar]);

  if (!navitar) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Talk to your navitar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You have no navitar yet. Create one in a battle to talk to it.
        </Typography>
      </Paper>
    );
  }

  const status = liveAiEnabled ? liveAiStatus() : 'off';

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');

    // Your message goes into the thread store; take the returned
    // thread's messages as the new state.
    const afterYou = appendMessage(threadId, { from: 'you', text, ts: Date.now() });
    if (!afterYou) return;
    setMessages(afterYou.messages);

    setBusy(true);
    setUnavailable(false);
    // Pause so the reply reads as typed, not instant — same delay as
    // the Messages page.
    await new Promise(resolve => setTimeout(resolve, REPLY_DELAY_MS));
    if (!mountedRef.current) return;
    // One reply path: scripted bank by default, DeepSeek when Live AI
    // is ON with a key, scripted fallback on a failed live call.
    const reply = await getThreadReply(afterYou, text);
    if (!mountedRef.current) return;
    const afterThem = appendMessage(threadId, {
      from: 'them',
      text: reply.text,
      ts: Date.now(),
    });
    if (afterThem) setMessages(afterThem.messages);
    if (reply.liveAiUnavailable) setUnavailable(true);
    setBusy(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Talk to {navitar.name}
      </Typography>
      {status === 'off' && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {LIVE_AI_OFF_LINE}
        </Typography>
      )}
      {status === 'on-no-key' && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {LIVE_AI_NO_KEY_LINE}
        </Typography>
      )}
      {unavailable && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {LIVE_AI_UNAVAILABLE_LINE}
        </Typography>
      )}
      <Box sx={{ mb: 2 }}>
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Say something to {navitar.name} — it answers in character.
          </Typography>
        ) : (
          messages.map((m, i) => (
            <Typography
              key={i}
              variant="body2"
              paragraph
              sx={{ mb: 1 }}
              data-from={m.from === 'you' ? 'you' : 'navitar'}
            >
              <strong>{m.from === 'you' ? 'You' : navitar.name}:</strong> {m.text}
            </Typography>
          ))
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label={`Message ${navitar.name}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void send();
          }}
          disabled={busy}
        />
        <Button variant="contained" onClick={() => void send()} disabled={busy || !input.trim()}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};
