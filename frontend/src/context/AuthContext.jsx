import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef.js';
import { authApi } from '../api/auth.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on app boot via httpOnly refresh token
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const refreshData = await authApi.refresh();
        if (refreshData && refreshData.accessToken) {
          const meData = await authApi.getMe();
          if (isMounted) {
            setUser(meData.user);
          }
        }
      } catch {
        // User not logged in, silent failure
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const register = useCallback(async (data) => {
    setError(null);
    try {
      const res = await authApi.register(data);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout cleanup errors
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : updatedUserData));
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
