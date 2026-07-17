import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  uid: string;
  email: string;
  role: 'Admin' | 'Technician' | 'User' | 'Public';
  name: string;
  token: string;
  category?: string;
  isOnline?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithMongoDB: (email: string, password: string) => Promise<void>;
  signUpWithMongoDB: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Standard MongoDB session restore
    const initializeAuth = async () => {
      const storedUserStr = localStorage.getItem('maintainiq_user');
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          const syncRes = await fetch('/api/v1/auth/sync-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedUser.token}`
            }
          });
          if (syncRes.ok) {
            const data = await syncRes.json();
            if (data.user) {
              const updatedUser: User = {
                ...storedUser,
                role: data.user.role || storedUser.role,
                name: data.user.name || storedUser.name,
                category: data.user.category,
                isOnline: data.user.isOnline,
              };
              setUser(updatedUser);
              localStorage.setItem('maintainiq_user', JSON.stringify(updatedUser));
            }
          } else {
            setUser(null);
            localStorage.removeItem('maintainiq_user');
          }
        } catch (err) {
          console.error("Error restoring local MongoDB session:", err);
          setUser(null);
          localStorage.removeItem('maintainiq_user');
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const loginWithMongoDB = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      const loggedUser: User = {
        uid: data.user.uid,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        token: data.token,
        category: data.user.category,
        isOnline: data.user.isOnline,
      };

      setUser(loggedUser);
      localStorage.setItem('maintainiq_user', JSON.stringify(loggedUser));
    } catch (err: any) {
      console.error("MongoDB login failed:", err);
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    }
  };

  const signUpWithMongoDB = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign-up failed');
      }

      const loggedUser: User = {
        uid: data.user.uid,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        token: data.token,
        category: data.user.category,
        isOnline: data.user.isOnline,
      };

      setUser(loggedUser);
      localStorage.setItem('maintainiq_user', JSON.stringify(loggedUser));
    } catch (err: any) {
      console.error("MongoDB sign-up failed:", err);
      setError(err.message || 'Sign-up failed.');
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('maintainiq_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithMongoDB,
      signUpWithMongoDB,
      logout,
      error,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
