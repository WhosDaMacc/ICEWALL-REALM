import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { fetchLeaderboard, REALM_LABELS } from '../utils/supabase';
import type { LeaderboardEntry } from '../utils/supabase';
import { useNavitarFightClub } from '../contexts/NavitarFightClub';

// The Pirates leaderboard: hunters and navitars on ONE board, sorted by
// score, with a realm tag on every row so a Treasure Quest hunter sits
// next to an ICEWALL-REALM navitar. Scores come from Supabase; a failed
// fetch shows a friendly line instead of a crash.
//
// The player's OWN row is always on the board (fix, live audit
// 2026-11-12: the board showed only the demo rows and the player was
// nowhere on it). It is built locally from the player's live battle
// points — the same total Profile shows — and merged into the fetched
// rows in score order, highlighted, so the player can always find
// themselves and see who is ahead of them.
const Pirates: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { points, userNavitar } = useNavitarFightClub();

  const ownEntry: LeaderboardEntry = {
    id: 'you',
    player_name: (() => {
      try {
        return localStorage.getItem('icewall-display-name') || 'You';
      } catch {
        return 'You';
      }
    })(),
    player_type: 'navitar',
    realm: 'icewall-realm',
    score: points,
    navitar_name: userNavitar?.name ?? null,
    created_at: '',
  };
  const rows: LeaderboardEntry[] | null =
    entries === null ? null : [...entries, ownEntry].sort((a, b) => b.score - a.score);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then(rows => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setError('Leaderboard unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ p: 2, maxWidth: 1000, margin: '0 auto' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Pirates Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Hunters and navitars on one board — the highest score takes the crown, whatever realm they
          sailed from.
        </Typography>
      </Paper>

      {error && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Couldn&apos;t load the leaderboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The scores didn&apos;t load just now — check your connection and try again in a moment.
            Your navitar is safe. Your own score stands at {points} points — it takes its place on
            the board as soon as the board loads.
          </Typography>
        </Paper>
      )}

      {!error && entries === null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading the leaderboard…</Typography>
        </Box>
      )}

      {!error && rows !== null && (
        <>
          <TableContainer component={Paper}>
            <Table aria-label="Pirates leaderboard">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell>Realm</TableCell>
                  <TableCell align="right">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((entry, i) => {
                  const isOwn = entry.id === 'you';
                  return (
                    <TableRow
                      key={entry.id}
                      data-you={isOwn ? 'true' : undefined}
                      sx={
                        isOwn
                          ? { bgcolor: 'rgba(33,150,243,0.16)', '& td': { fontWeight: 'bold' } }
                          : undefined
                      }
                    >
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        {entry.player_name}
                        {entry.player_type === 'navitar' &&
                        entry.navitar_name &&
                        entry.navitar_name !== entry.player_name
                          ? ` (${entry.navitar_name})`
                          : ''}
                        <Chip
                          label={entry.player_type === 'navitar' ? 'Navitar' : 'Hunter'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                        {isOwn && <Chip label="You" color="primary" size="small" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell>{REALM_LABELS[entry.realm] ?? entry.realm}</TableCell>
                      <TableCell align="right">{entry.score.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {entries !== null && entries.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No rival scores yet — your row is the first on the board.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default Pirates;
