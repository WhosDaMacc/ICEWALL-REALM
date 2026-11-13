import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink } from 'react-router-dom';

const LINKS = [
  { to: '/battle', label: 'Battle' },
  { to: '/collection', label: 'Collection' },
  { to: '/realm', label: 'Realm Map' },
  { to: '/messages', label: 'Messages' },
  { to: '/pirates', label: 'Pirates' },
  { to: '/stroll', label: 'Stroll' },
  { to: '/ar', label: 'AR View' },
  { to: '/profile', label: 'Profile' },
];

const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

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

        {/* Desktop: the full row. On phones the row is ~850px wide and
            forces horizontal scrolling, hiding the later links entirely —
            so below the md breakpoint it collapses into a menu. */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          {/* Battle used to be disabled until a navitar was selected in a
              different navitar model than the one the Battle page actually
              uses, so the link could never enable. The Battle page renders
              fine and now offers to create a Navitar when none exists. */}
          {LINKS.map(link => (
            <Button key={link.to} component={RouterLink} to={link.to} color="inherit">
              {link.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            color="inherit"
            aria-label="Open menu"
            aria-controls={menuOpen ? 'nav-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? 'true' : undefined}
            onClick={e => setAnchorEl(e.currentTarget)}
          >
            <MenuIcon />
          </IconButton>
          <Menu id="nav-menu" anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
            {LINKS.map(link => (
              <MenuItem
                key={link.to}
                component={RouterLink}
                to={link.to}
                onClick={() => setAnchorEl(null)}
              >
                {link.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
