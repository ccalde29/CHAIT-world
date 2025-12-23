// LoginRequiredModal.js
// Modal shown when user tries to access community features without login

import React from 'react';
import { X, Lock, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginRequiredModal = ({ isOpen, onClose, feature = 'Community' }) => {
  const { signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const featureDescriptions = {
    community: 'Browse and import characters and scenes from the community',
    import: 'Import characters and scenes created by other users',
    publish: 'Share your characters and scenes with the community',
    like: 'Like and favorite community content',
    comment: 'Comment on community characters and scenes'
  };

  const description = featureDescriptions[feature.toLowerCase()] || 
    'Access community features and share your creations';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <Lock className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sign In Required</h2>
              <p className="text-sm text-gray-400">Access {feature} Features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Feature Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Globe className="text-blue-400 mt-0.5" size={20} />
              <div>
                <h3 className="text-white font-medium mb-1">Community Features</h3>
                <p className="text-sm text-gray-400">
                  {description}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Sign in to unlock:
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Browse community characters and scenes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Import and use community content
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Publish your own creations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Like, comment, and interact
              </li>
            </ul>
          </div>

          {/* Privacy Note */}
          <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3">
            <strong>Privacy:</strong> All your local data stays on your device. 
            Signing in only enables community features. You can continue using the 
            app offline anytime.
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
