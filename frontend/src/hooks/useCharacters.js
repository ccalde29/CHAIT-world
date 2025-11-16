// hooks/useCharacters.js
// Custom hook for character and scenario management

import { useState, useEffect } from 'react';

export const useCharacters = (apiRequest) => {
  // State
  const [characters, setCharacters] = useState([]);
  const [activeCharacters, setActiveCharacters] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState('coffee-shop');
  const [characterSort, setCharacterSort] = useState('recent');
  const [characterSearch, setCharacterSearch] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Load data on mount
  useEffect(() => {
    loadCharacters();
    loadScenarios();
  }, []);

  const loadCharacters = async () => {
    try {
      const data = await apiRequest('/api/characters');
      setCharacters(data.characters || []);

      // Auto-activate first 3 characters if none selected
      if (data.characters && data.characters.length > 0 && activeCharacters.length === 0) {
        setActiveCharacters(data.characters.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const loadScenarios = async () => {
    try {
      const data = await apiRequest('/api/scenarios');
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const toggleCharacter = (character) => {
    setActiveCharacters(prev => {
      const isActive = prev.some(c => c.id === character.id);
      if (isActive) {
        return prev.filter(c => c.id !== character.id);
      } else {
        return [...prev, character];
      }
    });
  };

  const findCharacterById = (id) => {
    return characters.find(c => c.id === id);
  };

  const findScenarioById = (id) => {
    return scenarios.find(s => s.id === id);
  };

  // Filtered and sorted characters
  const getFilteredCharacters = () => {
    let filtered = [...characters];

    // Apply search filter
    if (characterSearch.trim()) {
      const searchLower = characterSearch.toLowerCase();
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(searchLower) ||
        char.personality?.toLowerCase().includes(searchLower)
      );
    }

    // Apply tag filter
    if (selectedTagFilter) {
      filtered = filtered.filter(char =>
        char.tags?.includes(selectedTagFilter)
      );
    }

    // Apply sorting
    switch (characterSort) {
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        filtered.sort((a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        break;
      default:
        break;
    }

    return filtered;
  };

  return {
    // State
    characters,
    activeCharacters,
    scenarios,
    currentScenario,
    characterSort,
    characterSearch,
    selectedTagFilter,

    // Actions
    setCharacters,
    setActiveCharacters,
    setScenarios,
    setCurrentScenario,
    setCharacterSort,
    setCharacterSearch,
    setSelectedTagFilter,
    loadCharacters,
    loadScenarios,
    toggleCharacter,
    findCharacterById,
    findScenarioById,
    getFilteredCharacters
  };
};
