import React from 'react';
import { NavitarShowcase } from '../components/NavitarShowcase';

// Navitar Collection page — thin wrapper around the existing
// NavitarShowcase component (sample Navitars until a real collection
// is wired to the chain / backend).
const NavitarCollection: React.FC = () => {
  return <NavitarShowcase />;
};

export default NavitarCollection;
