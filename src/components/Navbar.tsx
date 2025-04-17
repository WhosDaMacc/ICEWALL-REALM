import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useNavitar } from '../contexts/NavitarContext';

const Navbar: React.FC = () => {
  const { selectedNavitar } = useNavitar();

  return (
    <AppBar position="static" color="transparent" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          Icewall Realm
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={RouterLink}
            to="/battle"
            color="inherit"
            disabled={!selectedNavitar}
          >
            Battle
          </Button>
          <Button
            component={RouterLink}
            to="/collection"
            color="inherit"
          >
            Collection
          </Button>
          <Button
            component={RouterLink}
            to="/realm"
            color="inherit"
          >
            Realm Map
          </Button>
          <Button
            component={RouterLink}
            to="/profile"
            color="inherit"
          >
            Profile
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 