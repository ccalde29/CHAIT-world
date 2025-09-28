/**
 * Character Editor Component
 * 
 * Modal component for creating new characters or editing existing custom characters.
 * Provides form validation, emoji picker, and color selection.
 */
import React, { useState, useEffect } from 'react';
import { X, User, Palette, Smile, Sparkles } from 'lucide-react';
import ImageUpload from './ImageUpload';

const CharacterEditor = ({ character, onSave, onClose }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
 // UPDATE the formData state to include image fields (add this to your useState):
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    avatar: '🤖',
    color: 'from-gray-500 to-slate-500',
    avatar_image_url: null,
    avatar_image_filename: null,
    uses_custom_image: false
  });

  
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Pre-defined color options
  const colorOptions = [
    { name: 'Purple Pink', value: 'from-pink-500 to-purple-500' },
    { name: 'Blue Indigo', value: 'from-blue-500 to-indigo-500' },
    { name: 'Green Teal', value: 'from-green-500 to-teal-500' },
    { name: 'Orange Red', value: 'from-orange-500 to-red-500' },
    { name: 'Yellow Amber', value: 'from-yellow-500 to-amber-500' },
    { name: 'Cyan Blue', value: 'from-cyan-500 to-blue-500' },
    { name: 'Rose Pink', value: 'from-rose-500 to-pink-500' },
    { name: 'Emerald Green', value: 'from-emerald-500 to-green-500' },
    { name: 'Violet Purple', value: 'from-violet-500 to-purple-500' },
    { name: 'Gray Slate', value: 'from-gray-500 to-slate-500' }
  ];

  // Popular emoji options
  const emojiOptions = [
    '🤖', '👤', '🧑', '👩', '👨', '🧙‍♀️', '🧙‍♂️', '👑', '🎭', '🎨',
    '💻', '📚', '🎸', '🎵', '⚡', '🔥', '💫', '🌟', '✨', '🎯',
    '🚀', '💎', '🦋', '🌺', '🍃', '🌙', '☀️', '🌈', '🎪', '🎨',
    '🔮', '🎲', '🎪', '🎭', '🎨', '🎯', '🎸', '🎵', '📖', '💡'
  ];

  // Character personality templates for inspiration
  const personalityTemplates = [
    {
      name: "The Creative",
      personality: "An artistic soul who sees beauty and creativity in everything. Always excited about visual concepts, colors, and creative projects. Optimistic and playful with a vivid imagination."
    },
    {
      name: "The Philosopher", 
      personality: "A thoughtful intellectual who loves deep conversations about life, meaning, and human nature. Asks probing questions and often references philosophical concepts."
    },
    {
      name: "The Tech Enthusiast",
      personality: "A knowledgeable techie with a sharp wit and dry sense of humor. Loves discussing technology, programming, and internet culture. Slightly sarcastic but ultimately caring."
    }
  ];

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
  if (character) {
    // Editing existing character
    setFormData({
      name: character.name || '',
      personality: character.personality || '',
      avatar: character.avatar || '🤖',
      color: character.color || 'from-gray-500 to-slate-500',
      avatar_image_url: character.avatar_image_url || null,
      avatar_image_filename: character.avatar_image_filename || null,
      uses_custom_image: character.uses_custom_image || false
    });
  } else {
    // Creating new character - reset form
    setFormData({
      name: '',
      personality: '',
      avatar: '🤖',
      color: 'from-gray-500 to-slate-500',
      avatar_image_url: null,
      avatar_image_filename: null,
      uses_custom_image: false
    });
  }
  setValidationErrors({});
}, [character]);
  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Character name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Character name must be 50 characters or less';
    }
    
    if (!formData.personality.trim()) {
      errors.personality = 'Character personality is required';
    } else if (formData.personality.length < 20) {
      errors.personality = 'Personality description should be at least 20 characters';
    } else if (formData.personality.length > 500) {
      errors.personality = 'Personality description must be 500 characters or less';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

	const handleSave = async () => {
	  if (!validateForm()) return;
  
	  setSaving(true);
  
	  try {
    	const characterData = {
      	name: formData.name.trim(),
      	personality: formData.personality.trim(),
      	avatar: formData.avatar,
      	color: formData.color,
      	avatar_image_url: formData.avatar_image_url,
      	avatar_image_filename: formData.avatar_image_filename,
      	uses_custom_image: formData.uses_custom_image
    	};
    
    	await onSave(characterData);
  	} catch (error) {
   	 console.error('Failed to save character:', error);
  	} finally {
   	 setSaving(false);
  	}
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      personality: template.personality
    }));
    setValidationErrors(prev => ({ ...prev, personality: null }));
  };

  const getFieldError = (field) => {
    return validationErrors[field];
  };
 
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <User className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              {character ? 'Edit Character' : 'Create New Character'}
            </h2>
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
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${formData.color} flex items-center justify-center text-2xl`}>
              {formData.avatar}
            </div>
            <div>
              <div className="text-lg font-medium text-white">
                {formData.name || 'Character Name'}
              </div>
              <div className="text-sm text-gray-400">
                {formData.personality ? `${formData.personality.substring(0, 100)}${formData.personality.length > 100 ? '...' : ''}` : 'Character personality will appear here'}
              </div>
            </div>
          </div>

          {/* Character Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter character name"
              maxLength={50}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                getFieldError('name') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
              }`}
            />
            {getFieldError('name') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('name')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
          </div>

          {/* Avatar Selection with Image Upload */}
		 <div>
		 	<label className="block text-sm font-medium text-gray-300 mb-2">
			    <Smile size={16} className="inline mr-2" />
 			   Avatar
			  </label>
  
			  {/* Show current avatar in preview */}
 			 <div className="mb-4">
 			   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
 			     {formData.uses_custom_image && formData.avatar_image_url ? (
 			       <img 
  			        src={formData.avatar_image_url} 
 			         alt="Character avatar" 
 			         className="w-12 h-12 rounded-full object-cover"
  			      />
 			     ) : (
  			      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${formData.color} flex items-center justify-center text-xl`}>
   			       {formData.avatar}
   			     </div>
   			   )}
 			     <div>
    			    <div className="text-sm font-medium text-white">
  			        {formData.uses_custom_image ? 'Custom Image' : 'Emoji Avatar'}
 			       </div>
   			     <div className="text-xs text-gray-400">
    			      {formData.uses_custom_image ? 'Using uploaded image' : `Using emoji: ${formData.avatar}`}
    			    </div>
    			  </div>
   			 </div>
 		  </div>
 		  
			{/* Emoji Picker (when not using custom image) */}
 			 {!formData.uses_custom_image && (
  			  <div className="mb-4">
   			   <div className="flex items-center gap-2 mb-3">
 			       <button
  			        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
   			       className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
  			      >
   			       Current: {formData.avatar} - Click to change
 			       </button>
 			     </div>
 	     
  			    {showEmojiPicker && (
    			    <div className="grid grid-cols-10 gap-2 p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
    			      {emojiOptions.map((emoji, index) => (
     			       <button
   			           key={index}
     			         onClick={() => {
        			        handleInputChange('avatar', emoji);
       			         setShowEmojiPicker(false);
        			      }}
        			      className="w-8 h-8 text-xl hover:bg-white/10 rounded transition-colors"
       			     >
         			     {emoji}
 			           </button>
     			     ))}
   			     </div>
   			   )}
  			  </div>
 			 )}

            {/* Image Upload Component */}
            <ImageUpload
                currentImage={formData.avatar_image_url}
                currentEmoji={formData.avatar}
                onImageChange={(imageData) => {
                    setFormData(prev => ({
                        ...prev,
                        avatar_image_url: imageData.url,
                        avatar_image_filename: imageData.filename,
                        uses_custom_image: imageData.useCustomImage
                     }));
                  }}
                  type="character"
               />
			</div>
          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Palette size={16} className="inline mr-2" />
              Color Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleInputChange('color', option.value)}
                  className={`h-12 rounded-lg bg-gradient-to-r ${option.value} border-2 transition-all ${
                    formData.color === option.value ? 'border-white' : 'border-transparent hover:border-white/50'
                  }`}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          {/* Personality Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Sparkles size={16} className="inline mr-2" />
              Personality Templates (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {personalityTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => applyTemplate(template)}
                  className="p-3 text-left bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="text-sm font-medium text-white mb-1">{template.name}</div>
                  <div className="text-xs text-gray-400 line-clamp-2">{template.personality}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Personality Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Personality Description *
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => handleInputChange('personality', e.target.value)}
              placeholder="Describe your character's personality, traits, interests, and how they interact with others..."
              rows={6}
              maxLength={500}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                getFieldError('personality') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
              }`}
            />
            {getFieldError('personality') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('personality')}</p>
            )}
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Be specific about their communication style and interests</p>
              <p className="text-xs text-gray-500">{formData.personality.length}/500 characters</p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Character Creation Tips</h4>
            <ul className="text-xs text-blue-200 space-y-1">
              <li>• Be specific about their personality traits and communication style</li>
              <li>• Include their interests, hobbies, or areas of expertise</li>
              <li>• Describe how they typically respond in conversations</li>
              <li>• Consider their background, age, or profession if relevant</li>
              <li>• Think about what makes them unique and memorable</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {character && (
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    personality: '',
                    avatar: '🤖',
                    color: 'from-gray-500 to-slate-500'
                  });
                  setValidationErrors({});
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            >
              {saving ? 'Saving...' : character ? 'Update Character' : 'Create Character'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterEditor;
