import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { NavitarProvider } from './contexts/NavitarContext';
import { BattleProvider } from './contexts/BattleContext';

// Pages
import Home from './pages/Home';
import Battle from './pages/Battle';
import NavitarCollection from './pages/NavitarCollection';
import RealmMap from './pages/RealmMap';
import Profile from './pages/Profile';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavitarProvider>
        <BattleProvider>
          <Router>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/battle" element={<Battle />} />
                  <Route path="/collection" element={<NavitarCollection />} />
                  <Route path="/realm" element={<RealmMap />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </BattleProvider>
      </NavitarProvider>
    </ThemeProvider>
  );
};

export default App; 