import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import type { Tier } from './TierProgression';
import type { UserManagement } from '../typechain-types';
import type { BusinessProfile } from '../typechain-types';
import type { RealmSystem } from '../typechain-types';
import type { IceToken } from '../typechain-types';
import {
  UserManagement__factory,
  BusinessProfile__factory,
  RealmSystem__factory,
  IceToken__factory,
} from '../typechain-types';

// Combat contract surface used by CombatContext (useAbility, applyEffect,
// startBattle, endBattle, getRandomNumber) and TierProgression
// (getUserTier, unlockTier, enterRealm, mentorPlayer). No combat contract
// is committed in this repo — contracts/ has only UserManagement,
// BusinessProfile, RealmSystem and IceToken, and the NavitarFight /
// IceWallFightSystem contracts named in the spec were never added — so the
// provider exposes `contract: null` and both contexts run locally until a
// combat contract is deployed and wired into connectWallet. This interface
// is the shape that contract will need to satisfy.
export interface CombatContract {
  useAbility(abilityId: string, target: string): Promise<void>;
  applyEffect(target: string, effect: string): Promise<void>;
  startBattle(opponent: string, abilityIds: string[]): Promise<void>;
  endBattle(battleId: string): Promise<void>;
  getRandomNumber(): Promise<number>;
  getUserTier(account: string): Promise<{
    tier: Tier;
    battlesCompleted: number;
    tournamentsWon: number;
    mentors: number;
  }>;
  unlockTier(tier: Tier): Promise<void>;
  enterRealm(realmId: string): Promise<void>;
  mentorPlayer(playerAddress: string): Promise<void>;
}

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  userManagement: UserManagement | null;
  businessProfile: BusinessProfile | null;
  realmSystem: RealmSystem | null;
  iceToken: IceToken | null;
  // On-chain combat contract (see CombatContract above). Null until one exists.
  contract: CombatContract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  account: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  userManagement: null,
  businessProfile: null,
  realmSystem: null,
  iceToken: null,
  contract: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnected: false,
  account: null,
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [userManagement, setUserManagement] = useState<UserManagement | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [realmSystem, setRealmSystem] = useState<RealmSystem | null>(null);
  const [iceToken, setIceToken] = useState<IceToken | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        setIsConnected(true);

        // Initialize contracts via the typechain factories, which return
        // the correctly typed contract instances (a plain `new
        // ethers.Contract(...) as X` cast is rejected by the checker).
        const userManagementContract = UserManagement__factory.connect(
          process.env.REACT_APP_USER_MANAGEMENT_ADDRESS || '',
          signer
        );

        const businessProfileContract = BusinessProfile__factory.connect(
          process.env.REACT_APP_BUSINESS_PROFILE_ADDRESS || '',
          signer
        );

        const realmSystemContract = RealmSystem__factory.connect(
          process.env.REACT_APP_REALM_SYSTEM_ADDRESS || '',
          signer
        );

        const iceTokenContract = IceToken__factory.connect(
          process.env.REACT_APP_ICE_TOKEN_ADDRESS || '',
          signer
        );

        setUserManagement(userManagementContract);
        setBusinessProfile(businessProfileContract);
        setRealmSystem(realmSystemContract);
        setIceToken(iceTokenContract);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setUserManagement(null);
    setBusinessProfile(null);
    setRealmSystem(null);
    setIceToken(null);
    setIsConnected(false);
    setAccount(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        userManagement,
        businessProfile,
        realmSystem,
        iceToken,
        contract: null,
        connectWallet,
        disconnectWallet,
        isConnected,
        account,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
