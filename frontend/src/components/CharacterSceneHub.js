/**
 * Character & Scene Management Hub
 * Left sidebar showing user's characters and scenes with management options
 */

import React, { useState } from 'react';
import { Users, MapPin, Plus, Edit, Trash2, Eye, Search, X } from 'lucide-react';

const CharacterSceneHub = ({
  characters,
  scenes,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onAddScene,
  onEditScene,
  onDeleteScene,
  onOpenMemoryViewer
}) => {
  const [activeTab, setActiveTab] = useState('characters'); // 'characters' or 'scenes'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScenes = scenes.filter(scene =>
    scene.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-gray-800 border-r border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white mb-3">Management Hub</h2>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex-1 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'characters'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Users size={16} />
            Characters
          </button>
          <button
            onClick={() => setActiveTab('scenes')}
            className={`flex-1 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'scenes'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <MapPin size={16} />
            Scenes
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'characters' && (
          <div className="p-4 space-y-2">
            {/* Add Character Button */}
            <button
              onClick={onAddCharacter}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-lg transition-all font-medium"
            >
              <Plus size={18} />
              Create New Character
            </button>

            {/* Character List */}
            {filteredCharacters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No characters found' : 'No characters yet'}
                </p>
                <p className="text-xs mt-1">Create your first character!</p>
              </div>
            ) : (
              filteredCharacters.map((character) => (
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
                      <p className="font-medium text-white truncate">{character.name}</p>
                      {character.age && (
                        <p className="text-xs text-gray-500">{character.age} years old</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {character.personality?.substring(0, 50)}...
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => onEditCharacter(character)}
                          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => onOpenMemoryViewer(character)}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <Eye size={12} />
                          Memory
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${character.name}"?`)) {
                              onDeleteCharacter(character.id);
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'scenes' && (
          <div className="p-4 space-y-2">
            {/* Add Scene Button */}
            <button
              onClick={onAddScene}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-lg transition-all font-medium"
            >
              <Plus size={18} />
              Create New Scene
            </button>

            {/* Scene List */}
            {filteredScenes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No scenes found' : 'No scenes yet'}
                </p>
                <p className="text-xs mt-1">Create your first scene!</p>
              </div>
            ) : (
              filteredScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  {scene.background_image_url && scene.uses_custom_background && (
                    <div className="h-16 mb-2 rounded overflow-hidden">
                      <img
                        src={scene.background_image_url}
                        alt={scene.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="font-medium text-white">{scene.name}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {scene.description}
                  </p>
                  {scene.atmosphere && (
                    <p className="text-xs text-purple-300 mt-1">
                      {scene.atmosphere}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => onEditScene(scene)}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${scene.name}"?`)) {
                          onDeleteScene(scene.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSceneHub;
