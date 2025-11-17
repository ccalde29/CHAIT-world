/**
 * Active Chat Panel Component
 * Right sidebar showing current scene and active characters
 */

import React from 'react';
import { MapPin, Users, X, ChevronRight } from 'lucide-react';

const ActiveChatPanel = ({
  currentScene,
  activeCharacters,
  onRemoveCharacter,
  onChangeScene,
  isCollapsed,
  onToggleCollapse
}) => {
  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-800 border-l border-white/10 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Expand panel"
        >
          <ChevronRight size={20} className="rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin size={20} className="text-purple-400" />
          Active Chat
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
          title="Collapse panel"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Current Scene */}
        {currentScene && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Scene</h3>
              {onChangeScene && (
                <button
                  onClick={onChangeScene}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Change
                </button>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              {currentScene.background_image_url && currentScene.uses_custom_background && (
                <div className="h-20 mb-2 rounded overflow-hidden">
                  <img
                    src={currentScene.background_image_url}
                    alt={currentScene.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="font-medium text-white">{currentScene.name}</p>
              <p className="text-xs text-gray-400 mt-1">{currentScene.description}</p>
              {currentScene.atmosphere && (
                <p className="text-xs text-purple-300 mt-2">
                  <span className="font-medium">Mood:</span> {currentScene.atmosphere}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Active Characters */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Users size={16} />
              Characters ({activeCharacters.length})
            </h3>
          </div>

          {activeCharacters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No characters selected</p>
              <p className="text-xs mt-1">Start a new chat to add characters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCharacters.map((character) => (
                <div
                  key={character.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${
                        character.color || 'from-gray-500 to-slate-500'
                      } flex items-center justify-center text-lg`}
                    >
                      {character.uses_custom_image && character.avatar_image_url ? (
                        <img
                          src={character.avatar_image_url}
                          alt={character.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{character.avatar || '🤖'}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-white truncate">{character.name}</p>
                        {onRemoveCharacter && (
                          <button
                            onClick={() => onRemoveCharacter(character)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Remove from chat"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {character.age && (
                        <p className="text-xs text-gray-500">{character.age} years old</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {character.personality?.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveChatPanel;
