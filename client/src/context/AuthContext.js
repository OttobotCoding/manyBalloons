/**
 * client/src/context/AuthContext.js
 * Provides current user state and login/logout functions to the entire app.
 * On mount, calls /api/auth/me to check if an existing cookie is still valid.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, logoutUser, getMe } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);  // true while checking cookie
  const [needsSetup,   setNeedsSetup]   = useState(false); // true if no account exists yet

  // On first render, check if the browser has a valid session cookie
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await getMe();
        setUser(res.data);
      } catch (err) {
        // 401 = not logged in or expired cookie — that's fine
        // 403 with specific message = needs setup (checked in Login page)
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (username, password, rememberMe) => {
    const res = await loginUser({ username, password, rememberMe });
    setUser(res.data);
    return res;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsSetup, setNeedsSetup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}