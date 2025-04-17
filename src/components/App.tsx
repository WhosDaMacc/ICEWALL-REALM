import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../styles/theme';
import Navbar from './Navbar';
import Home from './Home';
import Profile from './Profile';
import Realm from './Realm';
import Business from './Business';
import ARView from './ARView';
import { Web3Provider } from '../contexts/Web3Context';
import { UserProvider } from '../contexts/UserContext';
import { RealmProvider } from '../contexts/RealmContext';
import { ARProvider } from '../contexts/ARContext';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Web3Provider>
        <UserProvider>
          <RealmProvider>
            <ARProvider>
              <Router>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/realm/:id" element={<Realm />} />
                  <Route path="/realm/:id/ar" element={<ARView />} />
                  <Route path="/business/:id" element={<Business />} />
                </Routes>
              </Router>
            </ARProvider>
          </RealmProvider>
        </UserProvider>
      </Web3Provider>
    </ThemeProvider>
  );
};

export default App; 