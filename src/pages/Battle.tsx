import React from 'react';
import NavitarBattle from '../components/NavitarBattle';

// Battle page — thin wrapper around the existing NavitarBattle component.
// The providers (Realm, Business, Reward, NavitarFightClub) live at App
// level so the navitar created here is the same one the map companion and
// profile read. Do not re-wrap here: a second provider instance would
// shadow the app-level state and the created navitar would vanish on
// navigation (previously observed: Profile showed 0 navitars after
// creating one in Battle).
const Battle: React.FC = () => {
  return <NavitarBattle />;
};

export default Battle;
