/**
 * Character Memory Viewer Component
 * 
 * Shows character memories, relationships, and allows memory management
 * Useful for debugging and understanding how characters remember interactions
 */

import React, { useState, useEffect } from 'react';
import { X, Brain, Heart, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';

const CharacterMemoryViewer = ({ character, onClose, apiRequest }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [memories, setMemories] = useState([]);
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMemories, setShowMemories] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  const loadCharacterData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load memories
      const memoriesResponse = await apiRequest(`/api/character/${character.id}/memories`);
      setMemories(memoriesResponse.memories || []);
      
      // Load relationship
      const relationshipResponse = await apiRequest(`/api/character/${character.id}/relationship`);
      setRelationship(relationshipResponse.relationship || null);
      
    } catch (err) {
      console.error('Failed to load character data:', err);
      setError('Failed to load character data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMemories = async () => {
    if (!window.confirm(`Clear all memories for ${character.name}? This cannot be undone.`)) {
      return;
    }
    
    try {
      await apiRequest(`/api/character/${character.id}/memories`, {
        method: 'DELETE'
      });
      
      // Reload data
      await loadCharacterData();
      
    } catch (err) {
      console.error('Failed to clear memories:', err);
      setError('Failed to clear memories: ' + err.message);
    }
  };

  useEffect(() => {
    if (character) {
      loadCharacterData();
    }
  }, [character]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const getRelationshipColor = (type) => {
    switch (type) {
      case 'close_friend': return 'text-green-400 bg-green-400/20';
      case 'friend': return 'text-blue-400 bg-blue-400/20';
      case 'acquaintance': return 'text-yellow-400 bg-yellow-400/20';
      case 'dislike': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getMemoryTypeColor = (type) => {
    switch (type) {
      case 'relationship': return 'text-pink-400 bg-pink-400/20';
      case 'event': return 'text-purple-400 bg-purple-400/20';
      case 'preference': return 'text-green-400 bg-green-400/20';
      case 'fact': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${character.color} flex items-center justify-center text-sm`}>
              {character.avatar}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{character.name}'s Memory</h2>
              <p className="text-sm text-gray-400">Memories, relationships, and learned behaviors</p>
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
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-purple-400 mr-2" size={20} />
              <span className="text-white">Loading character data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Relationship Status */}
              {relationship && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="text-pink-400" size={20} />
                    <h3 className="text-lg font-medium text-white">Relationship Status</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getRelationshipColor(relationship.relationship_type)}`}>
                        {relationship.relationship_type.replace('_', ' ')}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Relationship</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {Math.round(relationship.familiarity_level * 100)}%
                      </div>
                      <p className="text-xs text-gray-400">Familiarity</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {Math.round(relationship.trust_level * 100)}%
                      </div>
                      <p className="text-xs text-gray-400">Trust</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {relationship.interaction_count || 0}
                      </div>
                      <p className="text-xs text-gray-400">Interactions</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Emotional Bond</span>
                      <span className="text-sm text-white">
                        {Math.round((relationship.emotional_bond + 1) * 50)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          relationship.emotional_bond > 0.3 ? 'bg-green-400' :
                          relationship.emotional_bond > -0.3 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.round((relationship.emotional_bond + 1) * 50)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Memories Section */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="text-purple-400" size={20} />
                    <h3 className="text-lg font-medium text-white">
                      Memories ({memories.length})
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMemories(!showMemories)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {showMemories ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showMemories ? 'Hide' : 'Show'}
                    </button>
                    
                    <button
                      onClick={loadCharacterData}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={16} />
                    </button>
                    
                    <button
                      onClick={clearMemories}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Clear all memories"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {showMemories && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {memories.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Brain size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No memories yet. Start chatting to build memories!</p>
                      </div>
                    ) : (
                      memories.map((memory, index) => (
                        <div key={memory.id || index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getMemoryTypeColor(memory.memory_type)}`}>
                                {memory.memory_type}
                              </span>
                              <span className="text-xs text-gray-400">
                                Importance: {Math.round(memory.importance_score * 100)}%
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(memory.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-white mb-2">{memory.memory_content}</p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Accessed {memory.access_count || 1} times</span>
                            <span>Last accessed: {formatDate(memory.last_accessed || memory.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">💡 How Character Memory Works</h4>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• <strong>Memories:</strong> Important facts and events from your conversations</li>
                  <li>• <strong>Relationships:</strong> How well the character knows and trusts you</li>
                  <li>• <strong>Familiarity:</strong> Increases with more interactions and personal sharing</li>
                  <li>• <strong>Trust:</strong> Grows when you share personal information or have positive interactions</li>
                  <li>• <strong>Emotional Bond:</strong> Reflects how the character feels about you based on your conversations</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterMemoryViewer;