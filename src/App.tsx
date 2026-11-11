import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { NavitarProvider } from './contexts/NavitarContext';
import { BattleProvider } from './contexts/BattleContext';
import { RealmProvider } from './contexts/RealmContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { RewardProvider } from './contexts/RewardContext';
import { NavitarFightClubProvider } from './contexts/NavitarFightClub';
import { VenueProvider } from './contexts/VenueContext';

// Pages
import Home from './pages/Home';
import Battle from './pages/Battle';
import NavitarCollection from './pages/NavitarCollection';
import RealmMap from './pages/RealmMap';
import Profile from './pages/Profile';
import Stroll from './pages/Stroll';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Routes wrapped in an error boundary keyed by path, so a crash on one
// page shows a fallback for that page only, and navigating away resets it.
const AppRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/collection" element={<NavitarCollection />} />
        <Route path="/realm" element={<RealmMap />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stroll" element={<Stroll />} />
      </Routes>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavitarProvider>
        <BattleProvider>
          {/* Provider chain lives here so its state is shared across pages:
              NavitarFightClub reads Business + Reward, Reward reads Realm,
              and the navitar created in Battle is the same one the map
              companion reads. Do not re-wrap pages in these providers — a
              second instance would shadow this state. */}
          <RealmProvider>
            <BusinessProvider>
              <RewardProvider>
                <NavitarFightClubProvider>
                  {/* VenueProvider nests inside the FightClub provider: the
                      meet card adds a demo person's navitar as a FightClub
                      opponent when a challenge is accepted. */}
                  <VenueProvider>
                    <Router basename="/ICEWALL-REALM">
                      <div className="app">
                        <Navbar />
                        <main className="main-content">
                          <AppRoutes />
                        </main>
                        <Footer />
                      </div>
                    </Router>
                  </VenueProvider>
                </NavitarFightClubProvider>
              </RewardProvider>
            </BusinessProvider>
          </RealmProvider>
        </BattleProvider>
      </NavitarProvider>
    </ThemeProvider>
  );
};

export default App;
