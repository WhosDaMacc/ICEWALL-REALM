import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 Icewall Realm. All rights reserved.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link
            href="https://github.com/WhosDaMacc/ICEWALL-REALM"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            underline="hover"
          >
            GitHub
          </Link>
          <Link
            href="#"
            color="inherit"
            underline="hover"
          >
            Terms
          </Link>
          <Link
            href="#"
            color="inherit"
            underline="hover"
          >
            Privacy
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer; 