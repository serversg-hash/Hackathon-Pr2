import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PublicAssetPage from './pages/PublicAssetPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Periodically poll location to react to manual browser bar changes immediately
    const interval = setInterval(handleLocationChange, 500);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  // Handle public QR code passport route
  // Path format: /assets/public/:code
  const publicAssetMatch = currentPath.match(/\/assets\/public\/([^/]+)/);
  if (publicAssetMatch) {
    return <PublicAssetPage />;
  }

  // Admin/Technician private workspace
  if (!user) {
    return <LoginPage />;
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
