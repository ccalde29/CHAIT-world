/**
 * PublishModal Component
 * Modal for publishing characters/scenes with privacy options
 */

import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';

const PublishModal = ({
  isOpen,
  onClose,
  onPublish,
  type = 'character', // 'character' or 'scene'
  name
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [hiddenFields, setHiddenFields] = useState([]);
  const [publishing, setPublishing] = useState(false);

  if (!isOpen) return null;

  const availableFields = type === 'character'
    ? [
        { value: 'personality', label: 'Personality & Background', description: 'Hide the character\'s personality and background description' },
        { value: 'appearance', label: 'Appearance', description: 'Hide the character\'s appearance description' },
        { value: 'background', label: 'Background', description: 'Hide additional background information' }
      ]
    : [
        { value: 'description', label: 'Description', description: 'Hide the scene\'s description (initial message will still be visible)' }
      ];

  const toggleField = (field) => {
    setHiddenFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
    // Auto-enable locking if any field is selected
    if (!hiddenFields.includes(field)) {
      setIsLocked(true);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const success = await onPublish({
        isLocked: isLocked && hiddenFields.length > 0,
        hiddenFields: isLocked ? hiddenFields : []
      });
      if (success !== false) {
        onClose();
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Publish to Community</h2>
            <p className="text-sm text-gray-400 mt-1">Publishing: {name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              Your {type} will be visible to everyone in the Community Hub. Others can import and use it.
            </p>
          </div>

          {/* Privacy Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium text-white">Privacy Options</h3>
            </div>

            <p className="text-xs text-gray-400">
              Hide specific fields from people who import your {type}. Hidden fields will be completely removed when someone imports it.
            </p>

            <div className="space-y-2">
              {availableFields.map(field => (
                <label
                  key={field.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    hiddenFields.includes(field.value)
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hiddenFields.includes(field.value)}
                    onChange={() => toggleField(field.value)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {hiddenFields.includes(field.value) ? (
                        <EyeOff size={14} className="text-amber-400" />
                      ) : (
                        <Eye size={14} className="text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-white">{field.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{field.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {hiddenFields.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-300">
                  <strong>Note:</strong> Hidden fields will be set to NULL when imported. Users won't be able to see or recover these fields.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
          >
            {publishing ? 'Publishing...' : 'Publish to Community'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
