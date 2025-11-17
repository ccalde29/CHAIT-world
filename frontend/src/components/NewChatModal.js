/**
 * New Chat Modal Component
 * Two-step flow: Scene Selection → Character Selection
 */

import React, { useState } from 'react';
import { X, MapPin, Users, Check, ArrowRight, Sparkles } from 'lucide-react';

const NewChatModal = ({
  scenes,
  characters,
  onStart,
  onClose
}) => {
  const [step, setStep] = useState(1); // 1 = scene, 2 = characters
  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedCharacters, setSelectedCharacters] = useState([]);

  const handleSceneSelect = (scene) => {
    setSelectedScene(scene);
    setStep(2);
  };

  const toggleCharacter = (character) => {
    setSelectedCharacters(prev => {
      const exists = prev.find(c => c.id === character.id);
      if (exists) {
        return prev.filter(c => c.id !== character.id);
      } else {
        return [...prev, character];
      }
    });
  };

  const handleStart = () => {
    if (selectedScene && selectedCharacters.length > 0) {
      onStart(selectedScene, selectedCharacters);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Start New Chat</h2>
              <p className="text-sm text-gray-400">
                {step === 1 ? 'Choose a scene to set the mood' : 'Select characters for this conversation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 px-6 py-4 bg-white/5">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-500' : 'bg-gray-700'}`}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <span className="text-sm font-medium">Scene</span>
          </div>
          <ArrowRight size={16} className="text-gray-500" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-500' : 'bg-gray-700'}`}>
              2
            </div>
            <span className="text-sm font-medium">Characters</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            /* Scene Selection */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSceneSelect(scene)}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-purple-400 transition-all text-left group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-2xl">
                      {scene.background_image_url ? (
                        <img src={scene.background_image_url} alt={scene.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <MapPin className="text-purple-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">
                        {scene.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{scene.description}</p>
                    </div>
                  </div>
                  {scene.context && (
                    <div className="text-xs text-gray-500 bg-white/5 rounded p-2 mt-2">
                      {scene.context}
                    </div>
                  )}
                  {scene.atmosphere && (
                    <div className="text-xs text-purple-300 mt-2">
                      <span className="font-medium">Atmosphere:</span> {scene.atmosphere}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            /* Character Selection */
            <div>
              <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Selected Scene:</span>
                </div>
                <p className="text-white font-medium">{selectedScene?.name}</p>
                <p className="text-sm text-gray-400 mt-1">{selectedScene?.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">
                    Choose Characters ({selectedCharacters.length} selected)
                  </h3>
                  {selectedCharacters.length > 0 && (
                    <button
                      onClick={() => setSelectedCharacters([])}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {characters.map((character) => {
                  const isSelected = selectedCharacters.find(c => c.id === character.id);
                  return (
                    <button
                      key={character.id}
                      onClick={() => toggleCharacter(character)}
                      className={`bg-white/5 border rounded-lg p-3 hover:bg-white/10 transition-all text-left ${
                        isSelected ? 'border-purple-400 bg-purple-500/10' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${character.color || 'from-gray-500 to-slate-500'} flex items-center justify-center text-lg`}>
                          {character.avatar || '🤖'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{character.name}</p>
                            {isSelected && <Check size={14} className="text-purple-400" />}
                          </div>
                          {character.age && (
                            <p className="text-xs text-gray-500">{character.age} years old</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {character.personality?.substring(0, 80)}...
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-white/10">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back to Scenes
            </button>
          )}
          <div className="flex-1" />
          {step === 2 && (
            <button
              onClick={handleStart}
              disabled={selectedCharacters.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center gap-2"
            >
              <Users size={16} />
              Start Chat with {selectedCharacters.length} Character{selectedCharacters.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
