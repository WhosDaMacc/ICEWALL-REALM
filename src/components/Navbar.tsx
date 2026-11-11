import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navbar: React.FC = () => {
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
          {/* Battle used to be disabled until a navitar was selected in a
              different navitar model than the one the Battle page actually
              uses, so the link could never enable. The Battle page renders
              fine and now offers to create a Navitar when none exists. */}
          <Button component={RouterLink} to="/battle" color="inherit">
            Battle
          </Button>
          <Button component={RouterLink} to="/collection" color="inherit">
            Collection
          </Button>
          <Button component={RouterLink} to="/realm" color="inherit">
            Realm Map
          </Button>
          <Button component={RouterLink} to="/profile" color="inherit">
            Profile
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
