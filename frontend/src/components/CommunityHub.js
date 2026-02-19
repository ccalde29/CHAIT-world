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
  Heart,
  MapPin,
  Trash2,
  Lock,
  Flag
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import ReportModal from './ReportModal';

const CommunityHub = ({
  onImport,
  onClose,
  apiRequest,
  userCharacters = [],
  userScenes = [],
  onUnpublishCharacter,
  onUnpublishScene,
  fullScreen = false,
  onImportCharacter,
  onImportScene
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [activeTab, setActiveTab] = useState('characters'); // 'characters' or 'scenes'
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, popular, trending
  const [selectedTags, setSelectedTags] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [likedCharacters, setLikedCharacters] = useState(new Set());
  const [likedScenes, setLikedScenes] = useState(new Set());
  const [likingCharacter, setLikingCharacter] = useState(null);
  const [likingScene, setLikingScene] = useState(null);
  const [unpublishing, setUnpublishing] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCharacter, setReportingCharacter] = useState(null);
  const [reportingScene, setReportingScene] = useState(null);
  const [reportType, setReportType] = useState('character');
  const LIMIT = 20;

  // ============================================================================
  // OWNERSHIP HELPERS
  // ============================================================================

  const isUserOwnedCharacter = (communityCharacter) => {
    return userCharacters.some(char => char.id === communityCharacter.id);
  };

  const isUserOwnedScene = (communityScene) => {
    return userScenes.some(scene => scene.id === communityScene.id);
  };

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

  const loadCommunityScenes = async (reset = false) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: LIMIT,
        offset: reset ? 0 : offset,
        sortBy,
        search: searchQuery
      });

      const response = await apiRequest(`/api/community/scenes?${params}`);

      if (reset) {
        setScenes(response.scenes || []);
        setOffset(LIMIT);
      } else {
        setScenes(prev => [...prev, ...(response.scenes || [])]);
        setOffset(prev => prev + LIMIT);
      }

      setHasMore(response.hasMore);

    } catch (error) {
      console.error('Failed to load community scenes:', error);
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

  const loadUserFavorites = async () => {
    try {
      const response = await apiRequest('/api/community/favorites');
      const favoriteIds = new Set(response.favorites?.map(f => f.character_id) || []);
      setLikedCharacters(favoriteIds);
    } catch (error) {
      console.error('Failed to load user favorites:', error);
    }
  };

  const loadUserSceneFavorites = async () => {
    try {
      const response = await apiRequest('/api/community/scene-favorites');
      const favoriteIds = new Set(response.favorites?.map(f => f.scene_id) || []);
      setLikedScenes(favoriteIds);
    } catch (error) {
      console.error('Failed to load user scene favorites:', error);
    }
  };

  useEffect(() => {
    loadPopularTags();
    loadUserFavorites();
    loadUserSceneFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === 'characters') {
      loadCommunityCharacters(true);
    } else if (activeTab === 'scenes') {
      loadCommunityScenes(true);
    }
  }, [activeTab, sortBy, selectedTags, searchQuery]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const handleImport = async (character) => {
    if (importing) return;

    setImporting(character.id);

    try {
      // Track view
      await apiRequest(`/api/community/characters/${character.id}/view`, {
        method: 'POST'
      });

      // Use new prop if available, otherwise use old pattern
      if (onImportCharacter) {
        await onImportCharacter(character);
      } else if (onImport) {
        const response = await apiRequest(`/api/community/characters/${character.id}/import`, {
          method: 'POST'
        });
        await onImport(response);
      } else {
        await apiRequest(`/api/community/characters/${character.id}/import`, {
          method: 'POST'
        });
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

  const handleLike = async (character, event) => {
    if (event) {
      event.stopPropagation();
    }

    if (likingCharacter) return;

    const isLiked = likedCharacters.has(character.id);
    setLikingCharacter(character.id);

    try {
      if (isLiked) {
        await apiRequest(`/api/community/characters/${character.id}/favorite`, {
          method: 'DELETE'
        });
        setLikedCharacters(prev => {
          const next = new Set(prev);
          next.delete(character.id);
          return next;
        });
        // Update character's favorite count
        setCharacters(prev => prev.map(c =>
          c.id === character.id
            ? { ...c, favorite_count: (c.favorite_count || 1) - 1 }
            : c
        ));
      } else {
        await apiRequest(`/api/community/characters/${character.id}/favorite`, {
          method: 'POST'
        });
        setLikedCharacters(prev => new Set([...prev, character.id]));
        // Update character's favorite count
        setCharacters(prev => prev.map(c =>
          c.id === character.id
            ? { ...c, favorite_count: (c.favorite_count || 0) + 1 }
            : c
        ));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setLikingCharacter(null);
    }
  };

  const handleLikeScene = async (scene, event) => {
    if (event) event.stopPropagation();
    if (likingScene) return;

    const isLiked = likedScenes.has(scene.id);
    setLikingScene(scene.id);

    try {
      if (isLiked) {
        await apiRequest(`/api/community/scenes/${scene.id}/favorite`, { method: 'DELETE' });
        setLikedScenes(prev => { const next = new Set(prev); next.delete(scene.id); return next; });
        setScenes(prev => prev.map(s =>
          s.id === scene.id ? { ...s, favorite_count: (s.favorite_count || 1) - 1 } : s
        ));
      } else {
        await apiRequest(`/api/community/scenes/${scene.id}/favorite`, { method: 'POST' });
        setLikedScenes(prev => new Set([...prev, scene.id]));
        setScenes(prev => prev.map(s =>
          s.id === scene.id ? { ...s, favorite_count: (s.favorite_count || 0) + 1 } : s
        ));
      }
    } catch (error) {
      console.error('Failed to toggle scene favorite:', error);
    } finally {
      setLikingScene(null);
    }
  };

  const handleImportScene = async (scene) => {
    if (importing) return;

    setImporting(scene.id);

    try {
      // Track view
      await apiRequest(`/api/community/scenes/${scene.id}/view`, {
        method: 'POST'
      });wait onImport(response);
      } else {
        await apiRequest(`/api/community/scenes/${scene.id}/import`, {
          method: 'POST'
        });
      }

      // Show success feedback
      alert(`Successfully imported ${scene.name}!`);

    } catch (error) {
      console.error('Failed to import scene:', error);
      alert('Failed to import scene. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  const handleReport = async ({ characterId, reason, details }) => {
    try {
      await apiRequest(`/api/community/characters/${characterId}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason,
          details
        })
      });

      alert('Report submitted successfully. Our moderation team will review it shortly.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw new Error(error.message || 'Failed to submit report');
    }
  };

  const handleReportScene = async ({ sceneId, reason, details }) => {
    try {
      await apiRequest(`/api/community/scenes/${sceneId}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason,
          details
        })
      });

      alert('Report submitted successfully. Our moderation team will review it shortly.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw new Error(error.message || 'Failed to submit report');
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

  const handleUnpublish = async (character, event) => {
    if (event) {
      event.stopPropagation();
    }

    if (unpublishing) return;

    if (!window.confirm(`Unpublish "${character.name}" from the Community Hub?`)) {
      return;
    }

    setUnpublishing(character.id);

    try {
      await onUnpublishCharacter(character.id);

      // Remove from local state
      setCharacters(prev => prev.filter(c => c.id !== character.id));

      alert(`Successfully unpublished ${character.name} from the community`);
    } catch (error) {
      console.error('Failed to unpublish character:', error);
      alert('Failed to unpublish character. Please try again.');
    } finally {
      setUnpublishing(null);
    }
  };

  const handleUnpublishScene = async (scene, event) => {
    if (event) {
      event.stopPropagation();
    }

    if (unpublishing) return;

    if (!window.confirm(`Unpublish "${scene.name}" from the Community Hub?`)) {
      return;
    }

    setUnpublishing(scene.id);

    try {
      await onUnpublishScene(scene.id);

      // Remove from local state
      setScenes(prev => prev.filter(s => s.id !== scene.id));

      alert(`Successfully unpublished ${scene.name} from the community`);
    } catch (error) {
      console.error('Failed to unpublish scene:', error);
      alert('Failed to unpublish scene. Please try again.');
    } finally {
      setUnpublishing(null);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderCharacterCard = (character) => (
    <div
      key={character.id}
      className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-orange-400/30 transition-all cursor-pointer group"
      onClick={() => setSelectedCharacter(character)}
    >
      {/* Character Image / Avatar Header */}
      <div className="relative h-16 flex items-center justify-center bg-gray-900">
        {character.uses_custom_image && character.avatar_image_url ? (
          <img
            src={character.avatar_image_url}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-full ${
              character.color || 'from-gray-500 to-slate-500'
            } flex items-center justify-center text-xl`}
          >
            <span>{character.avatar || '🤖'}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="font-bold text-white truncate text-center text-sm mb-0.5">{character.name}</p>
        {character.age && (
          <p className="text-[10px] text-gray-500 text-center mb-1">{character.age} years old</p>
        )}
        <p className="text-[10px] text-gray-400 line-clamp-2 text-center mb-1.5">
          {character.personality?.substring(0, 60)}...
        </p>

        {/* Tags */}
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mb-1.5 justify-center">
            {character.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="text-[10px] text-gray-500">+{character.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 mb-1.5">
          <div className="flex items-center gap-0.5">
            <Eye size={10} />
            <span>{character.view_count || 0}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Download size={10} />
            <span>{character.import_count || 0}</span>
          </div>
          <button
            onClick={(e) => handleLike(character, e)}
            disabled={likingCharacter === character.id}
            className={`flex items-center gap-0.5 transition-colors ${
              likedCharacters.has(character.id)
                ? 'text-orange-400 hover:text-orange-300'
                : 'text-gray-400 hover:text-orange-400'
            }`}
          >
            <Heart
              size={10}
              fill={likedCharacters.has(character.id) ? 'currentColor' : 'none'}
            />
            <span>{character.favorite_count || 0}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {!isUserOwnedCharacter(character) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReportingCharacter(character);
                setReportModalOpen(true);
              }}
              className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
            >
              <Flag size={10} />
              Report
            </button>
          )}

          {isUserOwnedCharacter(character) ? (
            <button
              onClick={(e) => handleUnpublish(character, e)}
              disabled={unpublishing === character.id}
              className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
            >
              {unpublishing === character.id ? (
                <>
                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-red-400"></div>
                  Unpublishing...
                </>
              ) : (
                <>
                  <Trash2 size={10} />
                  Unpublish
                </>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImport(character);
              }}
              disabled={importing === character.id}
              className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
            >
              {importing === character.id ? (
                <>
                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-orange-400"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Download size={10} />
                  Import
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSceneCard = (scene) => (
    <div
      key={scene.id}
      className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-orange-400/30 transition-all cursor-pointer group"
      onClick={() => setSelectedScene(scene)}
    >
      {/* Scene Background Image Header */}
      <div className="relative h-16 flex items-center justify-center bg-gray-900">
        {scene.background_image_url && scene.uses_custom_background ? (
          <img
            src={scene.background_image_url}
            alt={scene.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin size={20} className="text-white/30" />
        )}
      </div>

      {/* Scene Info */}
      <div className="p-2">
        <p className="font-bold text-white text-center text-sm mb-0.5 truncate">
          {scene.name}
        </p>

        <p className="text-[10px] text-gray-400 text-center mb-1 line-clamp-2">
          {scene.description}
        </p>

        {/* Atmosphere Badge */}
        {scene.atmosphere && (
          <div className="mb-1.5 text-center">
            <span className="text-[10px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded-full">
              {scene.atmosphere}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 mb-1.5">
          <div className="flex items-center gap-0.5">
            <Eye size={10} />
            <span>{scene.view_count || 0}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Download size={10} />
            <span>{scene.import_count || 0}</span>
          </div>
          <button
            onClick={(e) => handleLikeScene(scene, e)}
            disabled={likingScene === scene.id}
            className={`flex items-center gap-0.5 transition-colors ${
              likedScenes.has(scene.id)
                ? 'text-orange-400 hover:text-orange-300'
                : 'text-gray-400 hover:text-orange-400'
            }`}
          >
            <Heart
              size={10}
              fill={likedScenes.has(scene.id) ? 'currentColor' : 'none'}
            />
            <span>{scene.favorite_count || 0}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {isUserOwnedScene(scene) ? (
            <button
              onClick={(e) => handleUnpublishScene(scene, e)}
              disabled={unpublishing === scene.id}
              className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
            >
              {unpublishing === scene.id ? (
                <>
                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-red-400"></div>
                  Unpublishing...
                </>
              ) : (
                <>
                  <Trash2 size={10} />
                  Unpublish
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImportScene(scene);
                }}
                disabled={importing === scene.id}
                className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
              >
                {importing === scene.id ? (
                  <>
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-orange-400"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Download size={10} />
                    Import
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReportingScene(scene);
                  setReportType('scene');
                  setReportModalOpen(true);
                }}
                className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
              >
                <Flag size={10} />
                Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderSceneDetail = () => {
    if (!selectedScene) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-600">
                <MapPin size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedScene.name}</h2>
                {selectedScene.atmosphere && (
                  <p className="text-sm text-gray-400">Atmosphere: {selectedScene.atmosphere}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedScene(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Locked Content Warning */}
            {selectedScene.is_locked && selectedScene.hidden_fields?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                <Lock size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-300 font-medium">Privacy Protected</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    Some fields are hidden by the creator: {selectedScene.hidden_fields.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-orange-300 mb-2">Description</h3>
              {selectedScene.description ? (
                <p className="text-sm text-gray-300">{selectedScene.description}</p>
              ) : selectedScene.hidden_fields?.includes('description') ? (
                <p className="text-sm text-gray-500 italic flex items-center gap-2">
                  <Lock size={14} />
                  Hidden by creator
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">Not specified</p>
              )}
            </div>

            {/* Initial Message */}
            {selectedScene.initial_message && (
              <div>
                <h3 className="text-sm font-medium text-orange-300 mb-2">Initial Message</h3>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-sm text-gray-300 italic">"{selectedScene.initial_message}"</p>
                </div>
              </div>
            )}

            {/* Background Image */}
            {selectedScene.uses_custom_background && selectedScene.background_image_url && (
              <div>
                <h3 className="text-sm font-medium text-orange-300 mb-2">Background</h3>
                <img
                  src={selectedScene.background_image_url}
                  alt={`${selectedScene.name} background`}
                  className="w-full rounded-lg border border-white/10"
                />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Eye size={14} />
                </div>
                <div className="text-lg font-bold text-white">{selectedScene.view_count || 0}</div>
                <div className="text-xs text-gray-400">Views</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                  <Download size={14} />
                </div>
                <div className="text-lg font-bold text-white">{selectedScene.import_count || 0}</div>
                <div className="text-xs text-gray-400">Imports</div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handleLikeScene(selectedScene)}
                  disabled={likingScene === selectedScene.id}
                  className={`flex flex-col items-center w-full transition-colors ${
                    likedScenes.has(selectedScene.id) ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'
                  }`}
                >
                  <Heart size={14} fill={likedScenes.has(selectedScene.id) ? 'currentColor' : 'none'} className="mb-1" />
                  <div className="text-lg font-bold">{selectedScene.favorite_count || 0}</div>
                  <div className="text-xs">Favorites</div>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <CommentsSection
              itemId={selectedScene.id}
              itemType="scene"
              apiRequest={apiRequest}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <button
              onClick={() => {
                setReportingScene(selectedScene);
                setReportType('scene');
                setReportModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-colors"
            >
              <Flag size={16} />
              Report
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedScene(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleImportScene(selectedScene)}
                disabled={importing === selectedScene.id}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-all"
              >
                {importing === selectedScene.id ? 'Importing...' : 'Import Scene'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                  : `${selectedCharacter.color}`
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
            {/* Locked Content Warning */}
            {selectedCharacter.is_locked && selectedCharacter.hidden_fields?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                <Lock size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-300 font-medium">Privacy Protected</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    Some fields are hidden by the creator: {selectedCharacter.hidden_fields.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Personality */}
            <div>
              <h3 className="text-sm font-medium text-orange-300 mb-2">Personality</h3>
              {selectedCharacter.personality ? (
                <p className="text-sm text-gray-300">{selectedCharacter.personality}</p>
              ) : selectedCharacter.hidden_fields?.includes('personality') ? (
                <p className="text-sm text-gray-500 italic flex items-center gap-2">
                  <Lock size={14} />
                  Hidden by creator
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">Not specified</p>
              )}
            </div>

            {/* Appearance */}
            <div>
              <h3 className="text-sm font-medium text-orange-300 mb-2">Appearance</h3>
              {selectedCharacter.appearance ? (
                <p className="text-sm text-gray-300">{selectedCharacter.appearance}</p>
              ) : selectedCharacter.hidden_fields?.includes('appearance') ? (
                <p className="text-sm text-gray-500 italic flex items-center gap-2">
                  <Lock size={14} />
                  Hidden by creator
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">Not specified</p>
              )}
            </div>

            {/* Tags */}
            {selectedCharacter.tags && selectedCharacter.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-orange-300 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCharacter.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-orange-600/20 text-orange-300 px-2 py-1 rounded-full"
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

            {/* Comments Section */}
            <CommentsSection
              itemId={selectedCharacter.id}
              itemType="character"
              apiRequest={apiRequest}
            />
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
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-all"
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

  const containerClass = fullScreen
    ? "flex-1 bg-gray-900 flex flex-col overflow-hidden"
    : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4";

  const innerClass = fullScreen
    ? "flex-1 flex flex-col overflow-hidden"
    : "bg-slate-800 rounded-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {/* Header */}
        <div className="border-b border-white/10">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Users className="text-orange-400" size={24} />
              <div>
                <h2 className="text-xl font-bold text-white">Community Hub</h2>
                <p className="text-sm text-gray-400">Browse and import shared content</p>
              </div>
            </div>
            {!fullScreen && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('characters')}
              className={`pb-3 px-2 border-b-2 transition-colors ${
                activeTab === 'characters'
                  ? 'border-orange-400 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Characters
            </button>
            <button
              onClick={() => setActiveTab('scenes')}
              className={`pb-3 px-2 border-b-2 transition-colors ${
                activeTab === 'scenes'
                  ? 'border-orange-400 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Scenes
            </button>
          </div>
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
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
            >
              <option value="recent" className="bg-gray-800">
                Recent
              </option>
              <option value="popular" className="bg-gray-800">
                Popular
              </option>
              <option value="trending" className="bg-gray-800">
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
                    className="text-xs text-orange-400 hover:text-orange-300"
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
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {tagData.tag}
                    <span className="ml-1 text-xs opacity-70">({tagData.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {activeTab === 'characters' ? (
            <>
              {loading && characters.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {characters.map(renderCharacterCard)}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="text-center mt-6">
                      <button
                        onClick={() => loadCommunityCharacters(false)}
                        disabled={loading}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {loading && scenes.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
                    <p className="text-white">Loading community scenes...</p>
                  </div>
                </div>
              ) : scenes.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 mb-2">No scenes found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {scenes.map(renderSceneCard)}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="text-center mt-6">
                      <button
                        onClick={() => loadCommunityScenes(false)}
                        disabled={loading}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modals */}
      {selectedCharacter && renderCharacterDetail()}
      {selectedScene && renderSceneDetail()}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportingCharacter(null);
          setReportingScene(null);
          setReportType('character');
        }}
        character={reportingCharacter}
        scene={reportingScene}
        itemType={reportType}
        onSubmit={reportType === 'character' ? handleReport : handleReportScene}
      />
    </div>
  );
};

export default CommunityHub;