/**
 * Character & Scene Management Hub
 * Left sidebar showing user's characters and scenes with management options
 */

import React, { useState } from 'react';
import { Users, MapPin, Plus, Edit, Trash2, Eye, Search, X, Upload, LayoutGrid } from 'lucide-react';
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
  user,
  apiRequest,
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

  const innerClass = fullScreen
    ? "flex-1 flex flex-col overflow-hidden"
    : "";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <LayoutGrid className="text-orange-400" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white">Management Hub</h2>
            <p className="text-sm text-gray-400">Manage your characters and scenes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('characters')}
            className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'characters'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users size={16} />
            Characters
          </button>
          <button
            onClick={() => setActiveTab('scenes')}
            className={`pb-3 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'scenes'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
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
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
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
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        {activeTab === 'characters' && (
          <div className="p-4">
            {/* Add Character Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={onAddCharacter}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium text-sm"
              >
                <Plus size={16} />
                Create New Character
              </button>
            </div>

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
              <div className="overflow-x-auto pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-max sm:min-w-0">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-orange-400/30 transition-all group"
                >
                  {/* Delete button positioned inside the card (top-right) */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${character.name}"?`)) {
                        onDeleteCharacter(character.id);
                      }
                    }}
                    className="absolute right-2 top-2 z-10 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 p-1.5 hover:bg-black/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${character.name}`}
                  >
                    <Trash2 size={14} />
                  </button>

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

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-0.5 flex-wrap">
                        <button
                          onClick={() => onEditCharacter(character)}
                          className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                        >
                          <Edit size={10} />
                          Edit
                        </button>
                        <button
                          onClick={() => onOpenMemoryViewer(character)}
                          className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                        >
                          <Eye size={10} />
                          Memory
                        </button>
                        {character.is_public ? (
                          <button
                            disabled
                            className="flex items-center gap-0.5 text-[10px] text-green-200 px-1.5 py-0.5 rounded bg-white/5 cursor-not-allowed whitespace-nowrap"
                            title="Already published to Community"
                          >
                            <Users size={10} />
                            Published
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setPublishItem(character);
                              setPublishType('character');
                              setPublishModalOpen(true);
                            }}
                            className="flex items-center gap-0.5 text-[10px] text-green-400 hover:text-green-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors whitespace-nowrap"
                          >
                            <Users size={10} />
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                </div>
              ))
              }
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scenes' && (
          <div className="p-4 space-y-2">
            {/* Add Scene Button */}
            <div className="flex justify-center mb-2">
              <button
                onClick={onAddScene}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium text-sm"
              >
                <Plus size={16} />
                Create New Scene
              </button>
            </div>

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
              <div className="overflow-x-auto pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-max sm:min-w-0">
                {filteredScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-orange-400/30 transition-all group"
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
                    <p className="font-semibold text-white text-center text-sm mb-1 line-clamp-1">
                      {scene.name}
                    </p>

                    <p className="text-[10px] text-gray-400 text-center mb-1 line-clamp-2">
                      {scene.description}
                    </p>

                    {scene.atmosphere && (
                      <p className="text-[10px] text-orange-300 text-center mb-1.5 line-clamp-1">
                        {scene.atmosphere}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-0.5 flex-wrap">
                      <button
                        onClick={() => onEditScene(scene)}
                        className="flex items-center gap-0.5 text-[10px] text-orange-400 hover:text-orange-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                      >
                        <Edit size={10} />
                        Edit
                      </button>
                      {scene.is_public ? (
                        <button
                          disabled
                          className="flex items-center gap-0.5 text-[10px] text-green-200 px-1.5 py-0.5 rounded bg-white/5 cursor-not-allowed whitespace-nowrap"
                          title="Already published to Community"
                        >
                          <MapPin size={10} />
                          Published
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPublishItem(scene);
                            setPublishType('scene');
                            setPublishModalOpen(true);
                          }}
                          className="flex items-center gap-0.5 text-[10px] text-green-400 hover:text-green-300 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors whitespace-nowrap"
                        >
                          <Upload size={10} />
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${scene.name}"?`)) {
                            onDeleteScene(scene.id);
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 px-2 py-1 hover:bg-white/5 rounded transition-colors"
                      >
                      <Trash2 size={12} />
                      Delete
                      </button>
                    </div>
                  </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
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
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CharacterSceneHub;
