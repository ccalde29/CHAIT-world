/**
 * Publish Character Modal (Optional Enhancement)
 * Shows character preview and publishing guidelines before publishing
 */

import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

const PublishCharacterModal = ({ character, onPublish, onClose }) => {
  const [publishing, setPublishing] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handlePublish = async () => {
    if (!agreed) {
      alert('Please agree to the community guidelines');
      return;
    }

    setPublishing(true);
    try {
      await onPublish();
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Upload className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">Publish to Community</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Character Preview */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-300 mb-3">Character Preview</h3>
            <div className="flex items-start gap-3">
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
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium">{character.name}</h4>
                  {character.age && (
                    <span className="text-xs text-gray-400">({character.age})</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mb-2">{character.personality}</p>
                {character.tags && character.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {character.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
              <CheckCircle size={16} />
              Community Guidelines
            </h3>
            <ul className="text-xs text-blue-200 space-y-1">
              <li>✓ Character must be 18 or older</li>
              <li>✓ Content must be appropriate for all audiences</li>
              <li>✓ No hate speech, harassment, or offensive content</li>
              <li>✓ No copyrighted characters without permission</li>
              <li>✓ Character should be well-described and functional</li>
            </ul>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-300 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              Before Publishing
            </h3>
            <p className="text-xs text-yellow-200">
              Once published, this character will be visible to all community members. 
              Other users will be able to import and use this character. You can unpublish 
              at any time, but copies that have been imported will remain with other users.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="agree" className="text-sm text-gray-300 cursor-pointer">
              I confirm that this character follows the community guidelines and 
              I have the right to share this content. I understand that inappropriate 
              content may be removed and could result in account restrictions.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!agreed || publishing}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            {publishing ? 'Publishing...' : 'Publish to Community'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishCharacterModal;