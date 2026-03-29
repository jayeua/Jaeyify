import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      await api.init();
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const profile = await api.getProfile();
        setUser(profile);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.log('Auto-login failed:', err.message);
      await AsyncStorage.removeItem('auth_token');
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(loginStr, password) {
    const data = await api.login(loginStr, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  }

  async function register(username, email, password) {
    const data = await api.register(username, email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  }

  async function logout() {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshProfile: loadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
