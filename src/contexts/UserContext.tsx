import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

interface UserProfile {
  email: string;
  username: string;
  walletAddress: string;
  accountStatus: number;
  verificationStatus: number;
  lastLogin: number;
  reputation: number;
}

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  isLoading: false,
  error: null,
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userManagement, account, isConnected } = useWeb3();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (!userManagement || !account) return;

    try {
      setIsLoading(true);
      setError(null);

      const userProfile = await userManagement.getUserProfile(account);
      // The on-chain struct calls the status field `status` (not
      // `accountStatus`), and ethers v6 returns the uint256/enum fields as
      // bigint — convert them to the numbers the app profile uses.
      setProfile({
        email: userProfile.email,
        username: userProfile.username,
        walletAddress: userProfile.walletAddress,
        accountStatus: Number(userProfile.status),
        verificationStatus: Number(userProfile.verificationStatus),
        lastLogin: Number(userProfile.lastLogin),
        reputation: Number(userProfile.reputation),
      });
    } catch (err) {
      setError('Failed to load user profile');
      console.error('Error loading user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userManagement || !account) return;

    try {
      setIsLoading(true);
      setError(null);

      // The UserManagement contract has no update function — email/username
      // are set once at registration (createUserProfile) — so edits apply
      // locally only, and no chain refresh is done here (refreshing would
      // reload the unchanged on-chain values and undo the edit). The
      // contract needs an update path before edits can persist on-chain.
      setProfile(prev => (prev ? { ...prev, ...updates } : prev));
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [isConnected, account]);

  return (
    <UserContext.Provider
      value={{
        profile,
        isLoading,
        error,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
