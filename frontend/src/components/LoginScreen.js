// ============================================================================
// LoginScreen.js - Login Component
// frontend/src/components/LoginScreen.js
// ============================================================================

import React, { useState } from 'react';
import { Users, Chrome } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = () => {
  const { signInWithGoogle, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="text-purple-400" size={32} />
            <h1 className="text-2xl font-bold text-white">
              CH
              <span className="text-purple-400">AI</span>
              T World
            </h1>
          </div>
          <p className="text-gray-300">
            Create AI characters and have group conversations in immersive scenarios
          </p>
        </div>

        {/* Features Preview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Create custom AI characters with unique personalities</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Chat with multiple characters simultaneously</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Design immersive scenarios and locations</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>Use OpenAI, Anthropic, or local AI models</span>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium py-3 px-4 rounded-lg transition-all"
          >
            <Chrome size={20} />
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;