// frontend/src/hooks/useOfflineStatus.js
// React hook for monitoring offline/online status

import { useState, useEffect, useCallback } from 'react';
import { checkServerHealth, isOffline, isCommunityAvailable } from '../utils/apiClient';

/**
 * Hook to monitor server online/offline status
 * @param {number} checkInterval - Interval in milliseconds (default: 30000)
 * @returns {Object} Status information
 */
export const useOfflineStatus = (checkInterval = 30000) => {
  const [status, setStatus] = useState({
    isOnline: true,
    isChecking: true,
    mode: 'web',
    communityAvailable: true,
    offlineMode: false,
    lastChecked: null,
    error: null
  });

  const checkStatus = useCallback(async () => {
    try {
      const health = await checkServerHealth();
      
      setStatus({
        isOnline: !health.offline,
        isChecking: false,
        mode: health.mode || 'web',
        communityAvailable: health.features?.communityFeatures === true,
        offlineMode: health.features?.offlineMode === true,
        lastChecked: new Date(),
        error: null
      });
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isChecking: false,
        communityAvailable: false,
        lastChecked: new Date(),
        error: error.message
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Periodic checks
    const interval = setInterval(checkStatus, checkInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [checkStatus, checkInterval]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => checkStatus();
    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        communityAvailable: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkStatus]);

  return {
    ...status,
    refresh: checkStatus
  };
};

/**
 * Simple hook that just returns whether community features are available
 * @returns {boolean}
 */
export const useCommunityAvailable = () => {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    isCommunityAvailable().then(setAvailable);
  }, []);

  return available;
};

export default useOfflineStatus;
