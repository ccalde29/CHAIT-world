/**
 * Community Hub Component
 * Browse, search, and import characters shared by the community
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Star, 
  Eye, 
  TrendingUp,
  Clock,
  Users,
  Filter,
  Heart,
  Flag,
  CheckCircle
} from 'lucide-react';

const CommunityHub = ({ onImport, onClose, apiRequest }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, popular, trending
  const [selectedTags, setSelectedTags] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  const loadCommunityCharacters = async (reset = false) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        limit: LIMIT,
        offset: reset ? 0 : offset,
        sortBy,
        search: searchQuery
      });
      
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      
      const response = await apiRequest(`/api/community/characters?${params}`);
      
      if (reset) {
        setCharacters(response.characters || []);
        setOffset(LIMIT);
      } else {
        setCharacters(prev => [...prev, ...(response.characters || [])]);
        setOffset(prev => prev + LIMIT);
      }
      
      setHasMore(response.hasMore);
      
    } catch (error) {
      console.error('Failed to load community characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPopularTags = async () => {
    try {
      const response = await apiRequest('/api/community/tags');
      setPopularTags(response.tags || []);
    } catch (error) {
      console.error('Failed to load popular tags:', error);
    }
  };

  useEffect(() => {
    loadPopularTags();
  }, []);

  useEffect(() => {
    loadCommunityCharacters(true);
  }, [sortBy, selectedTags, searchQuery]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const handleImport = async (character) => {
    if (importing) return;
    
    setImporting(character.id);
    
    try {
      const response = await apiRequest(`/api/community/characters/${character.id}/import`, {
        method: 'POST'
      });
      
      // Track view
      await apiRequest(`/api/community/characters/${character.id}/view`, {
        method: 'POST'
      });
      
      // Call parent's onImport callback
      if (onImport) {
        await onImport(response);
      }
      
      // Show success feedback
      alert(`Successfully imported ${character.name}!`);
      
    } catch (error) {
      console.error('Failed to import character:', error);
      alert('Failed to import character. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('recent');
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderCharacterCard = (character) => (
    <div
      key={character.id}
      className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition-all cursor-pointer"
      onClick={() => setSelectedCharacter(character)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            character.uses_custom_image && character.avatar_image_url
              ? ''
              : `bg-gradient-to-r ${character.color}`
          }`}>
            {character.uses_custom_image && character.avatar_image_url ? (
              <img
                src={character.avatar_image_url}
                alt={`${character.name} avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl">{character.avatar}</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium mb-1 flex items-center gap-2">
              {character.name}
              {character.age && (
                <span className="text-xs text-gray-400">({character.age})</span>
              )}
            </h3>
            <p className="text-xs text-gray-300 line-clamp-2">
              {character.personality}
            </p>
          </div>
        </div>

        {/* Tags */}
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {character.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 4 && (
              <span className="text-xs text-gray-500">+{character.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye size={12} />
              <span>{character.view_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download size={12} />
              <span>{character.import_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={12} />
              <span>{character.favorite_count || 0}</span>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleImport(character);
            }}
            disabled={importing === character.id}
            className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
          >
            {importing === character.id ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>Import</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCharacterDetail = () => {
    if (!selectedCharacter) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                selectedCharacter.uses_custom_image && selectedCharacter.avatar_image_url
                  ? ''
                  : `bg-gradient-to-r ${selectedCharacter.color}`
              }`}>
                {selectedCharacter.uses_custom_image && selectedCharacter.avatar_image_url ? (
                  <img
                    src={selectedCharacter.avatar_image_url}
                    alt={`${selectedCharacter.name} avatar`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">{selectedCharacter.avatar}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedCharacter.name}
                  {selectedCharacter.age && (
                    <span className="text-sm text-gray-400">({selectedCharacter.age})</span>
                  )}
                </h2>
                {selectedCharacter.sex && (
                  <p className="text-sm text-gray-400">{selectedCharacter.sex}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedCharacter(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Personality */}
            <div>
              <h3 className="text-sm font-medium text-purple-300 mb-2">Personality</h3>
              <p className="text-sm text-gray-300">{selectedCharacter.personality}</p>
            </div>

            {/* Appearance */}
            {selectedCharacter.appearance && (
              <div>
                <h3 className="text-sm font-medium text-purple-300 mb-2">Appearance</h3>
                <p className="text-sm text-gray-300">{selectedCharacter.appearance}</p>
              </div>
            )}

            {/* Tags */}
            {selectedCharacter.tags && selectedCharacter.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-purple-300 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCharacter.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Eye size={14} />
                </div>
                <div className="text-lg font-bold text-white">{selectedCharacter.view_count || 0}</div>
                <div className="text-xs text-gray-400">Views</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Download size={14} />
                </div>
                <div className="text-lg font-bold text-white">{selectedCharacter.import_count || 0}</div>
                <div className="text-xs text-gray-400">Imports</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Heart size={14} />
                </div>
                <div className="text-lg font-bold text-white">{selectedCharacter.favorite_count || 0}</div>
                <div className="text-xs text-gray-400">Favorites</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
            <button
              onClick={() => setSelectedCharacter(null)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => handleImport(selectedCharacter)}
              disabled={importing === selectedCharacter.id}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg transition-all"
            >
              {importing === selectedCharacter.id ? 'Importing...' : 'Import Character'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Users className="text-purple-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Community Hub</h2>
              <p className="text-sm text-gray-400">Browse and import characters shared by the community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-white/10 space-y-4">
          {/* Search and Sort */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
            >
              <option value="recent" className="bg-gray-800">
                <Clock size={16} className="inline mr-2" />
                Recent
              </option>
              <option value="popular" className="bg-gray-800">
                <Star size={16} className="inline mr-2" />
                Popular
              </option>
              <option value="trending" className="bg-gray-800">
                <TrendingUp size={16} className="inline mr-2" />
                Trending
              </option>
            </select>
          </div>

          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">Popular Tags</h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 15).map((tagData, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleTag(tagData.tag)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      selectedTags.includes(tagData.tag)
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {tagData.tag}
                    <span className="ml-1 text-xs opacity-70">({tagData.usage_count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && characters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-white">Loading community characters...</p>
              </div>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-2">No characters found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map(renderCharacterCard)}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => loadCommunityCharacters(false)}
                    disabled={loading}
                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Character Detail Modal */}
      {selectedCharacter && renderCharacterDetail()}
    </div>
  );
};

export default CommunityHub;