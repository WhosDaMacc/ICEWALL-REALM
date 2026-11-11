import React from 'react';
import NavitarBattle from '../components/NavitarBattle';
import { NavitarFightClubProvider } from '../contexts/NavitarFightClub';
import { BusinessProvider } from '../contexts/BusinessContext';
import { RewardProvider } from '../contexts/RewardContext';
import { RealmProvider } from '../contexts/RealmContext';

// Battle page — thin wrapper around the existing NavitarBattle component.
// Providers are nested in dependency order: RewardProvider reads the Realm
// context, and NavitarFightClub reads Business + Reward, so those must be
// ancestors.
const Battle: React.FC = () => {
  return (
    <RealmProvider>
      <BusinessProvider>
        <RewardProvider>
          <NavitarFightClubProvider>
            <NavitarBattle />
          </NavitarFightClubProvider>
        </RewardProvider>
      </BusinessProvider>
    </RealmProvider>
  );
};

export default Battle;
