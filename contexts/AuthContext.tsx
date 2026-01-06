// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState } from 'react';

export interface UserType {
  user_id: string;
  name: string;
  email: string;
}

export interface SiteType {
  id: string;
  name: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  sites: SiteType[];
  setSites: React.Dispatch<React.SetStateAction<SiteType[]>>;
  selectedSite: SiteType | null;
  setSelectedSite: React.Dispatch<React.SetStateAction<SiteType | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [sites, setSites] = useState<SiteType[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteType | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        const sitesData = await AsyncStorage.getItem('sites');

        if (token) setIsLoggedIn(true);
        if (userData) setUser(JSON.parse(userData));
        if (sitesData) {
          const parsedSites: SiteType[] = JSON.parse(sitesData);
          setSites(parsedSites);
          if (parsedSites.length > 0) setSelectedSite(parsedSites[0]); // chọn site mặc định là site đầu tiên
        }
      } catch (err) {
        console.error('Error loading auth data:', err);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
        user,
        setUser,
        sites,
        setSites,
        selectedSite,
        setSelectedSite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
