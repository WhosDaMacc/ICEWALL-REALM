import React, { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { askDeepSeek, liveAiStatus } from '../utils/liveAi';

export const LIVE_AI_OFF_LINE =
  'Live AI is off — your navitar answers from its scripted lines until go-live.';
export const LIVE_AI_NO_KEY_LINE =
  'Live AI is on but no DeepSeek key is configured — add it at build time. Answering from scripted lines for now.';
export const LIVE_AI_UNAVAILABLE_LINE =
  'Live AI is unavailable right now — answering from scripted lines.';

// Scripted replies — the only thing the navitar says while Live AI is
// off (the default) or whenever a live call fails. No network involved.
const SCRIPTED_REPLIES = [
  (name: string) => `${name} nods, ready for whatever comes next.`,
  (name: string) => `${name} grins. "Say the word and we fight."`,
  (name: string) => `${name} stretches and looks toward the nearest arena.`,
  (name: string) => `"I remember every duel we've won," ${name} says. "Let's win another."`,
  (name: string) => `${name} tilts its head, listening.`,
];

interface NavitarChatProps {
  navitar: { name: string; element: string } | null;
  liveAiEnabled: boolean;
}

interface ChatMessage {
  from: 'you' | 'navitar';
  text: string;
}

// Talk to your navitar. The toggle on the Profile page decides what
// happens when you send a message:
// - OFF (default): scripted reply only, zero network calls, zero charges.
// - ON + no key: a visible "no key configured" line, scripted reply only.
// - ON + key: the message goes to DeepSeek, reply shown in character;
//   on any failure the scripted line answers instead.
export const NavitarChat: React.FC<NavitarChatProps> = ({ navitar, liveAiEnabled }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

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

  const scriptedReply = () => {
    const pick = SCRIPTED_REPLIES[Math.floor(Math.random() * SCRIPTED_REPLIES.length)];
    return pick(navitar.name);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages(prev => [...prev, { from: 'you', text }]);

    if (status !== 'ready') {
      // OFF, or ON with no key baked into the build: no network call.
      setMessages(prev => [...prev, { from: 'navitar', text: scriptedReply() }]);
      return;
    }

    setBusy(true);
    setUnavailable(false);
    const reply = await askDeepSeek({
      navitarName: navitar.name,
      character: navitar.element,
      userMessage: text,
    });
    setBusy(false);
    if (reply) {
      setMessages(prev => [...prev, { from: 'navitar', text: reply }]);
    } else {
      setUnavailable(true);
      setMessages(prev => [...prev, { from: 'navitar', text: scriptedReply() }]);
    }
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
            <Typography key={i} variant="body2" paragraph sx={{ mb: 1 }} data-from={m.from}>
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
