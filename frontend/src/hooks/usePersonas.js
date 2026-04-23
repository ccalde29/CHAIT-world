import { useState, useEffect, useCallback } from 'react';

export const usePersonas = (apiRequest) => {
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all personas
  const fetchPersonas = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[usePersonas] Fetching personas...');
      const data = await apiRequest('/api/personas');
      console.log('[usePersonas] Received personas:', data);
      setPersonas(data.personas || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching personas:', err);
      setError('Failed to fetch personas');
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // Fetch active persona
  const fetchActivePersona = useCallback(async () => {
    try {
      console.log('[usePersonas] Fetching active persona...');
      const data = await apiRequest('/api/personas/active');
      console.log('[usePersonas] Active persona:', data);
      setActivePersona(data.persona);
      setError(null);
    } catch (err) {
      console.error('Error fetching active persona:', err);
      setError('Failed to fetch active persona');
    }
  }, [apiRequest]);

  // Activate a persona
  const activatePersona = useCallback(async (personaId) => {
    try {
      const data = await apiRequest(`/api/personas/${personaId}/activate`, {
        method: 'POST'
      });
      setActivePersona(data.persona);
      await fetchPersonas(); // Refresh list
      return data;
    } catch (err) {
      console.error('Error activating persona:', err);
      throw err;
    }
  }, [apiRequest, fetchPersonas]);

  // Create a new persona
  const createPersona = useCallback(async (personaData) => {
    try {
      const data = await apiRequest('/api/personas', {
        method: 'POST',
        body: JSON.stringify(personaData)
      });
      await fetchPersonas(); // Refresh list
      return data.persona;
    } catch (err) {
      console.error('Error creating persona:', err);
      throw err;
    }
  }, [apiRequest, fetchPersonas]);

  // Update a persona
  const updatePersona = useCallback(async (personaId, updates) => {
    try {
      const data = await apiRequest(`/api/personas/${personaId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await fetchPersonas(); // Refresh list
      if (activePersona?.id === personaId) {
        setActivePersona(data.persona);
      }
      return data.persona;
    } catch (err) {
      console.error('Error updating persona:', err);
      throw err;
    }
  }, [apiRequest, fetchPersonas, activePersona]);

  // Delete a persona
  const deletePersona = useCallback(async (personaId) => {
    try {
      await apiRequest(`/api/personas/${personaId}`, {
        method: 'DELETE'
      });
      await fetchPersonas(); // Refresh list
      await fetchActivePersona(); // Refresh active in case it changed
    } catch (err) {
      console.error('Error deleting persona:', err);
      throw err;
    }
  }, [apiRequest, fetchPersonas, fetchActivePersona]);

  // Initial load
  useEffect(() => {
    fetchPersonas();
    fetchActivePersona();
  }, [fetchPersonas, fetchActivePersona]);

  return {
    personas,
    activePersona,
    loading,
    error,
    fetchPersonas,
    fetchActivePersona,
    activatePersona,
    createPersona,
    updatePersona,
    deletePersona
  };
};
