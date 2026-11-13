import React from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';

// Demo legal pages — the footer's Terms / Privacy links used to be
// dead "#" anchors. These are brief placeholder texts for the demo,
// labelled as such; real terms get written before any public launch.
export const TermsPage: React.FC = () => (
  <Box sx={{ py: 4, maxWidth: 800, margin: '0 auto' }}>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Terms of Service <Chip label="DEMO" size="small" sx={{ ml: 1 }} />
      </Typography>
      <Typography variant="body1" paragraph>
        This is a demo build of ICEWALL-REALM. These terms are placeholder text for the demo — not a
        binding legal document.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        In the demo: play fair, battles are opt-in, and nothing here costs real money. Demo venues,
        perks and leaderboards are illustrative. Game progress is stored on your own device. Final
        terms will be published before the game opens to the public.
      </Typography>
    </Paper>
  </Box>
);

export const PrivacyPage: React.FC = () => (
  <Box sx={{ py: 4, maxWidth: 800, margin: '0 auto' }}>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Privacy Policy <Chip label="DEMO" size="small" sx={{ ml: 1 }} />
      </Typography>
      <Typography variant="body1" paragraph>
        This is a demo build of ICEWALL-REALM. This policy is placeholder text for the demo — not a
        binding legal document.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        In the demo: your profile, navitars, points and messages live in your browser&apos;s local
        storage on your own device — the demo does not sell or share personal data. Location is only
        used when you tap “Find me” on the Realm Map. A full privacy policy will be published before
        the game opens to the public.
      </Typography>
    </Paper>
  </Box>
);
