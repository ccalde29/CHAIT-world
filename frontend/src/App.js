// ============================================================================
// App.js - Root Component with Authentication Logic
// frontend/src/App.js
// ============================================================================

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainApp from './components/MainApp';
import LoginScreen from './components/LoginScreen';
import './index.css';

// Inner component that has access to auth context
const AppContent = () => {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white">Loading CHAIT World...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show main app if authenticated
  return <MainApp />;
};

// Root App component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;