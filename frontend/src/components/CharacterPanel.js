// components/CharacterPanel.js
// Character selection and management panel

import React from 'react';
import { Plus, Search, SortAsc, Eye, EyeOff, Brain, Edit, Trash2 } from 'lucide-react';

const CharacterPanel = ({
  characters,
  activeCharacters,
  characterSort,
  characterSearch,
  selectedTagFilter,
  onToggleCharacter,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onSortChange,
  onSearchChange,
  onTagFilterChange,
  onOpenMemoryViewer
}) => {
  // Get all unique tags from characters
  const allTags = [...new Set(characters.flatMap(c => c.tags || []))];

  return (
    <div className="w-80 bg-gray-800 border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Characters</h2>
          <button
            onClick={onAddCharacter}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            title="Add Character"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={characterSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search characters..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
          />
        </div>

        {/* Sort and Filter */}
        <div className="flex gap-2">
          <select
            value={characterSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-400"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">A-Z</option>
          </select>

          {allTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => onTagFilterChange(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-400"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Character List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {characters.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No characters yet</p>
            <button
              onClick={onAddCharacter}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Create your first character
            </button>
          </div>
        ) : (
          characters.map(character => {
            const isActive = activeCharacters.some(c => c.id === character.id);

            return (
              <div
                key={character.id}
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-500/20 border-red-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => onToggleCharacter(character)}
              >
                {/* Character Info */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${character.color} flex items-center justify-center text-white text-xl`}>
                    {character.uses_custom_image && character.avatar_image_url ? (
                      <img
                        src={character.avatar_image_url}
                        alt={character.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      character.avatar
                    )}
                  </div>

                  {/* Name and Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{character.name}</h3>
                      {isActive ? (
                        <Eye size={14} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <EyeOff size={14} className="text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {character.personality?.substring(0, 60)}...
                    </p>

                    {/* Tags */}
                    {character.tags && character.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {character.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-white/5 text-gray-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {character.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-white/5 text-gray-400 rounded text-xs">
                            +{character.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons (shown on hover) */}
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMemoryViewer(character);
                    }}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
                    title="View Memories"
                  >
                    <Brain size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCharacter(character);
                    }}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit size={14} />
                  </button>
                  {!character.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ${character.name}?`)) {
                          onDeleteCharacter(character.id);
                        }
                      }}
                      className="p-1.5 bg-gray-700 hover:bg-red-600 rounded text-gray-300 hover:text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Count */}
      <div className="p-4 border-t border-white/10">
        <div className="text-sm text-gray-400">
          <span className="text-white font-semibold">{activeCharacters.length}</span> character{activeCharacters.length !== 1 ? 's' : ''} active
        </div>
      </div>
    </div>
  );
};

export default CharacterPanel;
