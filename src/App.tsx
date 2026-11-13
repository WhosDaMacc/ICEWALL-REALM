import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { NavitarProvider } from './contexts/NavitarContext';
import { AuthProvider } from './contexts/AuthContext';
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
import Messages from './pages/Messages';
import { PrivacyPage, TermsPage } from './pages/Legal';
import Pirates from './pages/Pirates';
import Stroll from './pages/Stroll';
import ARView from './pages/ARView';

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
        {/* /map is the map's natural URL — the name everyone types
            and shares — but the route only ever existed as /realm,
            so a direct load of /map matched nothing and Routes
            rendered a blank page (live check 2026-11-12; in-app
            navigation never hit it because the Navbar links /realm).
            Alias it, and give unknown paths a home landing instead
            of a blank: deep links must never dead-end. */}
        <Route path="/map" element={<RealmMap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Profile />} />
        {/* The Joe quiz is GONE (Eddie, 2026-11-12: "There should be
            no quiz, scrap the quiz. I just wanted to fight."). Joe is
            fought as a boss opponent in the normal battle flow, so
            /joe redirects to the Battle Arena, where the CHALLENGE
            JOE button pre-selects him. */}
        <Route path="/joe" element={<Navigate to="/battle" replace />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/pirates" element={<Pirates />} />
        <Route path="/stroll" element={<Stroll />} />
        <Route path="/ar" element={<ARView />} />
      </Routes>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* AuthProvider sits outside the Router: auth state is app-wide
          and sign-in never redirects or walls anything off — signed-out
          play works exactly as before. */}
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
