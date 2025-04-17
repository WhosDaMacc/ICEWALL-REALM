import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { UserManagement } from '../typechain-types';
import { BusinessProfile } from '../typechain-types';
import { RealmSystem } from '../typechain-types';
import { IceToken } from '../typechain-types';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  userManagement: UserManagement | null;
  businessProfile: BusinessProfile | null;
  realmSystem: RealmSystem | null;
  iceToken: IceToken | null;
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

        // Initialize contracts
        const userManagementContract = new ethers.Contract(
          process.env.REACT_APP_USER_MANAGEMENT_ADDRESS || '',
          UserManagement.abi,
          signer
        ) as UserManagement;

        const businessProfileContract = new ethers.Contract(
          process.env.REACT_APP_BUSINESS_PROFILE_ADDRESS || '',
          BusinessProfile.abi,
          signer
        ) as BusinessProfile;

        const realmSystemContract = new ethers.Contract(
          process.env.REACT_APP_REALM_SYSTEM_ADDRESS || '',
          RealmSystem.abi,
          signer
        ) as RealmSystem;

        const iceTokenContract = new ethers.Contract(
          process.env.REACT_APP_ICE_TOKEN_ADDRESS || '',
          IceToken.abi,
          signer
        ) as IceToken;

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