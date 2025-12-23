// frontend/src/components/OfflineIndicator.js
// Visual indicator for offline/online status

import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

const OfflineIndicator = () => {
  const { isOnline, mode, communityAvailable, offlineMode } = useOfflineStatus();

  // Don't show anything if fully online in web mode
  if (isOnline && mode === 'web') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {!communityAvailable && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-semibold">Offline Mode</div>
            <div className="text-sm">Community features unavailable</div>
          </div>
        </div>
      )}
      
      {offlineMode && communityAvailable && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-semibold">Local Mode</div>
            <div className="text-sm">Data saved locally</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
