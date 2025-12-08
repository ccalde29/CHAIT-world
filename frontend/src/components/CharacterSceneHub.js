/**
 * Character & Scene Management Hub
 * Left sidebar showing user's characters and scenes with management options
 */

import React, { useState } from 'react';
import { Users, MapPin, Plus, Edit, Trash2, Eye, Search, X, Upload } from 'lucide-react';
import PublishModal from './PublishModal';

const CharacterSceneHub = ({
  characters,
  scenes,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onPublishCharacter,
  onAddScene,
  onEditScene,
  onDeleteScene,
  onPublishScene,
  onOpenMemoryViewer,
  fullScreen = false
}) => {
  const [activeTab, setActiveTab] = useState('characters'); // 'characters' or 'scenes'
  const [searchQuery, setSearchQuery] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishItem, setPublishItem] = useState(null);
  const [publishType, setPublishType] = useState('character');

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScenes = scenes.filter(scene =>
    scene.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerClass = fullScreen
    ? "flex-1 bg-gray-900 flex flex-col overflow-hidden"
    : "w-80 bg-gray-800 border-r border-white/10 flex flex-col overflow-hidden";

  return (
    <div className={containerClass}>
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
          <div className="p-4">
            {/* Add Character Button */}
            <button
              onClick={onAddCharacter}
              className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-lg transition-all font-medium mb-4"
            >
              <Plus size={18} />
              Create New Character
            </button>

            {/* Character Grid */}
            {filteredCharacters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No characters found' : 'No characters yet'}
                </p>
                <p className="text-xs mt-1">Create your first character!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-purple-400/30 transition-all group"
                >
                  {/* Delete button positioned inside the card (top-right) */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${character.name}"?`)) {
                        onDeleteCharacter(character.id);
                      }
                    }}
                    className="absolute right-2 top-2 z-10 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 p-1.5 hover:bg-black/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${character.name}`}
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Character Image / Avatar Header */}
                  <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                    {character.uses_custom_image && character.avatar_image_url ? (
                      <img
                        src={character.avatar_image_url}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                          character.color || 'from-gray-500 to-slate-500'
                        } flex items-center justify-center text-3xl`}
                      >
                        <span>{character.avatar || '🤖'}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-bold text-white truncate text-center mb-1">{character.name}</p>
                    {character.age && (
                      <p className="text-xs text-gray-500 text-center mb-2">{character.age} years old</p>
                    )}
                    <p className="text-xs text-gray-400 line-clamp-2 text-center mb-3">
                      {character.personality?.substring(0, 80)}...
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-1 flex-wrap">
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
                        {character.is_public ? (
                          <button
                            disabled
                            className="flex items-center gap-1 text-xs text-green-200 px-2 py-1 rounded bg-white/5 cursor-not-allowed whitespace-nowrap"
                            title="Already published to Community"
                          >
                            <Users size={12} />
                            Published
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPublishItem(character);
                              setPublishType('character');
                              setPublishModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 px-2 py-1 hover:bg-white/5 rounded transition-colors whitespace-nowrap"
                          >
                            <Users size={12} />
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                </div>
              ))
              }
              </div>
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

            {/* Scene Grid */}
            {filteredScenes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No scenes found' : 'No scenes yet'}
                </p>
                <p className="text-xs mt-1">Create your first scene!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-purple-400/30 transition-all group"
                  >
                  {/* Scene Background Image Header */}
                  <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-purple-700 to-blue-800">
                    {scene.background_image_url && scene.uses_custom_background ? (
                      <img
                        src={scene.background_image_url}
                        alt={scene.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin size={40} className="text-white/30" />
                    )}
                  </div>

                  {/* Scene Info */}
                  <div className="p-3">
                    <p className="font-semibold text-white text-center mb-2 line-clamp-1">
                      {scene.name}
                    </p>

                    <p className="text-xs text-gray-400 text-center mb-2 line-clamp-2">
                      {scene.description}
                    </p>

                    {scene.atmosphere && (
                      <p className="text-xs text-purple-300 text-center mb-3 line-clamp-1">
                        {scene.atmosphere}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button
                        onClick={() => onEditScene(scene)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                      >
                        <Edit size={12} />
                        Edit
                      </button>
                      {scene.is_public ? (
                        <button
                          disabled
                          className="flex items-center gap-1 text-xs text-green-200 px-2 py-1 rounded bg-white/5 cursor-not-allowed whitespace-nowrap"
                          title="Already published to Community"
                        >
                          <MapPin size={12} />
                          Published
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPublishItem(scene);
                            setPublishType('scene');
                            setPublishModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 px-2 py-1 hover:bg-white/5 rounded transition-colors whitespace-nowrap"
                        >
                          <Upload size={12} />
                          Publish
                        </button>
                      )}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => {
          setPublishModalOpen(false);
          setPublishItem(null);
        }}
        onPublish={async (options) => {
          if (publishType === 'character') {
            const success = await onPublishCharacter(publishItem.id, options);
            return success;
          } else {
            const success = await onPublishScene(publishItem.id, options);
            return success;
          }
        }}
        type={publishType}
        name={publishItem?.name}
      />
    </div>
  );
};

export default CharacterSceneHub;
