// hooks/useTokens.js
// Custom hook for token balance management

import { useState, useEffect, useCallback } from 'react';

export const useTokens = (apiRequest) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refillInfo, setRefillInfo] = useState(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[useTokens] Fetching token balance...');
      const response = await apiRequest('/api/tokens/balance');
      console.log('[useTokens] Token balance fetched:', response.balance);
      setBalance(response.balance);
      setRefillInfo(response.refill_info);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    refillInfo,
    refreshBalance: fetchBalance
  };
};
