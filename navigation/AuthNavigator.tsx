import React, { createContext, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [user, setUser] = useState<any>(null);

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "mustChangePassword",
    ]);
    setIsLoggedIn(false);
    setUser(null);
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        mustChangePassword,
        setMustChangePassword,
        user,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
