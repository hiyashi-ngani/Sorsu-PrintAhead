import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, AppNotification } from '../types/index.ts';
import { api } from '../api/client.ts';
import { signInWithSorSUGoogle, signOutGoogle } from '../utils/googleAuth.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  login: (email: string, password: string, fullName?: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshNotifications = useCallback(async () => {
    if (!api.getToken()) {
      setNotifications([]);
      return;
    }
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function initAuth() {
      try {
        const token = api.getToken();
        if (token) {
          const currentUser = await api.getCurrentUser();
          setUser(currentUser);
          if (currentUser) {
            await refreshNotifications();
          }
        }
      } catch (err) {
        console.error('Failed to load current user:', err);
        api.clearToken();
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, [refreshNotifications]);

  const login = async (email: string, password: string, fullName?: string, role?: UserRole) => {
    const loggedUser = await api.login(email, password, fullName, role);
    setUser(loggedUser);
    refreshNotifications().catch(() => {});
  };

  const loginWithGoogle = async () => {
    const googleRes = await signInWithSorSUGoogle();
    const loggedUser = await api.loginWithGoogle(
      googleRes.accessToken,
      googleRes.email,
      googleRes.fullName
    );
    setUser(loggedUser);
    refreshNotifications().catch(() => {});
  };

  const logout = () => {
    api.clearToken();
    signOutGoogle().catch(() => {});
    setUser(null);
    setNotifications([]);
  };

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadCount,
        notifications,
        login,
        loginWithGoogle,
        logout,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
