// hooks/useSettings.js
// Custom hook for user settings and persona management

import { useState, useEffect } from 'react';

export const useSettings = (apiRequest) => {
  const [userSettings, setUserSettings] = useState({
    apiKeys: {},
    ollamaSettings: { baseUrl: 'http://localhost:11434' },
    groupDynamicsMode: 'natural',
    messageDelay: 1200
  });

  const [userPersona, setUserPersona] = useState(null);
  const [groupDynamicsMode, setGroupDynamicsMode] = useState('natural');

  // Load on mount
  useEffect(() => {
    loadUserSettings();
    loadUserPersona();
  }, []);

  const loadUserSettings = async () => {
    try {
      const settings = await apiRequest('/api/user/settings');
      setUserSettings(settings);
      setGroupDynamicsMode(settings.groupDynamicsMode || settings.group_dynamics_mode || 'natural');
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const loadUserPersona = async () => {
    try {
      const persona = await apiRequest('/api/user/persona');
      setUserPersona(persona);
    } catch (error) {
      console.error('Failed to load user persona:', error);
      setUserPersona({
        hasPersona: false,
        persona: {
          name: 'User',
          personality: 'A curious individual engaging in conversation',
          interests: [],
          communication_style: 'casual and friendly',
          avatar: '=d',
          color: 'from-blue-500 to-indigo-500'
        }
      });
    }
  };

  const saveUserSettings = async (updates) => {
    try {
      const response = await apiRequest('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      setUserSettings(response.settings);

      if (updates.groupDynamicsMode || updates.group_dynamics_mode) {
        setGroupDynamicsMode(updates.groupDynamicsMode || updates.group_dynamics_mode);
      }

      return response;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const saveUserPersona = async (personaData) => {
    try {
      const response = await apiRequest('/api/user/persona', {
        method: 'POST',
        body: JSON.stringify(personaData)
      });

      await loadUserPersona();
      return response;
    } catch (error) {
      console.error('Error saving persona:', error);
      throw error;
    }
  };

  return {
    // State
    userSettings,
    userPersona,
    groupDynamicsMode,

    // Actions
    setUserSettings,
    setUserPersona,
    setGroupDynamicsMode,
    loadUserSettings,
    loadUserPersona,
    saveUserSettings,
    saveUserPersona
  };
};
