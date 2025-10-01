/**
 * Character Editor Component - Enhanced Version
 * Phase 3: Expanded character creation with all new fields
 * 
 * New features:
 * - Age validation (18+)
 * - Sex/gender field
 * - Appearance description
 * - Background/history
 * - Chat examples (optional)
 * - Relationships to other characters
 * - Tags system
 * - Model settings (temperature, memory toggle)
 */

import React, { useState, useEffect } from 'react';
import { X, User, Palette, Smile, Sparkles, Plus, Trash2, Sliders, Brain, MessageSquare, Users as UsersIcon, Tag } from 'lucide-react';
import ImageUpload from './ImageUpload';

const CharacterEditor = ({ character, onSave, onClose, allCharacters = [] }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    sex: '',
    personality: '',
    appearance: '',
    background: '',
    avatar: '🤖',
    color: 'from-gray-500 to-slate-500',
    avatar_image_url: null,
    avatar_image_filename: null,
    uses_custom_image: false,
    chat_examples: [],
    relationships: [],
    tags: [],
    // Model settings
    temperature: 0.7,
    max_tokens: 150,
    context_window: 8000,
    memory_enabled: true
  });
  
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic'); // basic, examples, relationships, settings

  // Color options
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

  // Emoji options
  const emojiOptions = [
    '🤖', '👤', '🧑', '👩', '👨', '🧙‍♀️', '🧙‍♂️', '👑', '🎭', '🎨',
    '💻', '📚', '🎸', '🎵', '⚡', '🔥', '💫', '🌟', '✨', '🎯',
    '🚀', '💎', '🦋', '🌺', '🍃', '🌙', '☀️', '🌈', '🎪', '🎨',
    '🔮', '🎲', '🎪', '🎭', '🎨', '🎯', '🎸', '🎵', '📖', '💡'
  ];

  // Personality templates
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
      setFormData({
        name: character.name || '',
        age: character.age || 25,
        sex: character.sex || '',
        personality: character.personality || '',
        appearance: character.appearance || '',
        background: character.background || '',
        avatar: character.avatar || '🤖',
        color: character.color || 'from-gray-500 to-slate-500',
        avatar_image_url: character.avatar_image_url || null,
        avatar_image_filename: character.avatar_image_filename || null,
        uses_custom_image: character.uses_custom_image || false,
        chat_examples: character.chat_examples || [],
        relationships: character.relationships || [],
        tags: character.tags || [],
        temperature: character.temperature || 0.7,
        max_tokens: character.max_tokens || 150,
        context_window: character.context_window || 8000,
        memory_enabled: character.memory_enabled !== false
      });
    }
    setValidationErrors({});
  }, [character]);

  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
    
    if (!formData.age || formData.age < 18) {
      errors.age = 'Character must be 18 or older';
    } else if (formData.age > 999) {
      errors.age = 'Please enter a realistic age';
    }
    
    if (!formData.personality.trim()) {
      errors.personality = 'Character personality is required';
    } else if (formData.personality.length < 20) {
      errors.personality = 'Personality description should be at least 20 characters';
    } else if (formData.personality.length > 1000) {
      errors.personality = 'Personality description must be 1000 characters or less';
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
        age: parseInt(formData.age),
        sex: formData.sex.trim(),
        personality: formData.personality.trim(),
        appearance: formData.appearance.trim(),
        background: formData.background.trim(),
        avatar: formData.avatar,
        color: formData.color,
        avatar_image_url: formData.avatar_image_url,
        avatar_image_filename: formData.avatar_image_filename,
        uses_custom_image: formData.uses_custom_image,
        chat_examples: formData.chat_examples,
        relationships: formData.relationships,
        tags: formData.tags,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        context_window: formData.context_window,
        memory_enabled: formData.memory_enabled
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

  // ============================================================================
  // CHAT EXAMPLES MANAGEMENT
  // ============================================================================

  const addChatExample = () => {
    setFormData(prev => ({
      ...prev,
      chat_examples: [...prev.chat_examples, { user: '', character: '' }]
    }));
  };

  const updateChatExample = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      chat_examples: prev.chat_examples.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const removeChatExample = (index) => {
    setFormData(prev => ({
      ...prev,
      chat_examples: prev.chat_examples.filter((_, i) => i !== index)
    }));
  };

  // ============================================================================
  // RELATIONSHIPS MANAGEMENT
  // ============================================================================

  const addRelationship = () => {
    setFormData(prev => ({
      ...prev,
      relationships: [...prev.relationships, { characterId: '', characterName: '', relationship: '' }]
    }));
  };

  const updateRelationship = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.relationships];
      updated[index] = { ...updated[index], [field]: value };
      
      // If characterId changed, update characterName
      if (field === 'characterId') {
        const selectedChar = allCharacters.find(c => c.id === value);
        if (selectedChar) {
          updated[index].characterName = selectedChar.name;
        }
      }
      
      return { ...prev, relationships: updated };
    });
  };

  const removeRelationship = (index) => {
    setFormData(prev => ({
      ...prev,
      relationships: prev.relationships.filter((_, i) => i !== index)
    }));
  };

  // ============================================================================
  // TAGS MANAGEMENT
  // ============================================================================

  const addTag = () => {
    const tag = currentTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const getFieldError = (field) => {
    return validationErrors[field];
  };

  // ============================================================================
  // RENDER TABS
  // ============================================================================

  const renderBasicTab = () => (
    <div className="space-y-6">
      {/* Character Preview */}
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${formData.color} flex items-center justify-center text-2xl`}>
          {formData.uses_custom_image && formData.avatar_image_url ? (
            <img
              src={formData.avatar_image_url}
              alt="Character avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            formData.avatar
          )}
        </div>
        <div className="flex-1">
          <div className="text-lg font-medium text-white">
            {formData.name || 'Character Name'} {formData.age ? `(${formData.age})` : ''}
          </div>
          <div className="text-sm text-gray-400">
            {formData.sex && `${formData.sex} • `}
            {formData.personality ? `${formData.personality.substring(0, 100)}${formData.personality.length > 100 ? '...' : ''}` : 'Personality will appear here'}
          </div>
        </div>
      </div>

      {/* Name & Age Row */}
      <div className="grid grid-cols-2 gap-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Age *
            <span className="text-xs text-gray-500 ml-2">(Must be 18+)</span>
          </label>
          <input
            type="number"
            min="18"
            max="999"
            value={formData.age}
            onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 18)}
            className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
              getFieldError('age') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
            }`}
          />
          {getFieldError('age') && (
            <p className="text-red-400 text-xs mt-1">{getFieldError('age')}</p>
          )}
        </div>
      </div>

      {/* Sex/Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Sex / Gender
          <span className="text-xs text-gray-500 ml-2">(Optional - freeform)</span>
        </label>
        <input
          type="text"
          value={formData.sex}
          onChange={(e) => handleInputChange('sex', e.target.value)}
          placeholder="e.g., female, male, non-binary, etc."
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* Avatar Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Smile size={16} className="inline mr-2" />
          Avatar
        </label>
        
        {/* Current Avatar Preview */}
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
        
        {/* Emoji Picker */}
        {!formData.uses_custom_image && (
          <div className="mb-4">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
            >
              Current: {formData.avatar} - Click to change
            </button>
            
            {showEmojiPicker && (
              <div className="grid grid-cols-10 gap-2 p-3 bg-white/5 rounded-lg border border-white/10 mt-2">
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

        {/* Image Upload */}
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
          <span className="text-xs text-gray-500 ml-2">Describe their traits, quirks, and speaking style</span>
        </label>
        <textarea
          value={formData.personality}
          onChange={(e) => handleInputChange('personality', e.target.value)}
          placeholder="Describe your character's personality, traits, interests, and how they interact with others..."
          rows={6}
          maxLength={1000}
          className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
            getFieldError('personality') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
          }`}
        />
        {getFieldError('personality') && (
          <p className="text-red-400 text-xs mt-1">{getFieldError('personality')}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">{formData.personality.length}/1000 characters</p>
      </div>

      {/* Appearance */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Appearance
          <span className="text-xs text-gray-500 ml-2">Physical description, style, features</span>
        </label>
        <textarea
          value={formData.appearance}
          onChange={(e) => handleInputChange('appearance', e.target.value)}
          placeholder="Describe their physical appearance - height, build, features, style, etc."
          rows={3}
          maxLength={500}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none focus:border-purple-400"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.appearance.length}/500 characters</p>
      </div>

      {/* Background/History */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Background / History
          <span className="text-xs text-gray-500 ml-2">Backstory, life experiences, context</span>
        </label>
        <textarea
          value={formData.background}
          onChange={(e) => handleInputChange('background', e.target.value)}
          placeholder="Their backstory, life experiences, and context (optional)"
          rows={4}
          maxLength={800}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none focus:border-purple-400"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.background.length}/800 characters</p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Tag size={16} className="inline mr-2" />
          Tags
          <span className="text-xs text-gray-500 ml-2">For organization and filtering</span>
        </label>
        
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-purple-300 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add a tag..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );

  const renderExamplesTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 About Chat Examples</h4>
        <p className="text-xs text-blue-200">
          Provide example exchanges to help the AI understand this character's speaking style and responses. 
          This uses few-shot learning to make responses more consistent with your vision!
        </p>
      </div>

      {formData.chat_examples.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={32} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 text-sm mb-4">No chat examples yet</p>
          <button
            onClick={addChatExample}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <Plus size={16} className="inline mr-2" />
            Add First Example
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.chat_examples.map((example, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Example {index + 1}</span>
                <button
                  onClick={() => removeChatExample(index)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">You say:</label>
                  <input
                    type="text"
                    value={example.user}
                    onChange={(e) => updateChatExample(index, 'user', e.target.value)}
                    placeholder="Hello, how are you?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{formData.name || 'Character'} responds:</label>
                  <input
                    type="text"
                    value={example.character}
                    onChange={(e) => updateChatExample(index, 'character', e.target.value)}
                    placeholder="Hey! I'm great, just got back from hiking!"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addChatExample}
            className="w-full py-2 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-400 transition-colors"
          >
            <Plus size={16} className="inline mr-2" />
            Add Another Example
          </button>
        </div>
      )}
    </div>
  );

  const renderRelationshipsTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 About Relationships</h4>
        <p className="text-xs text-blue-200">
          Define how this character relates to your other characters. This helps maintain consistency 
          across multi-character conversations and creates more natural group dynamics.
        </p>
      </div>

      {formData.relationships.length === 0 ? (
        <div className="text-center py-8">
          <UsersIcon size={32} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 text-sm mb-4">No relationships defined yet</p>
          <button
            onClick={addRelationship}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            disabled={allCharacters.length === 0}
          >
            <Plus size={16} className="inline mr-2" />
            Add Relationship
          </button>
          {allCharacters.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">Create more characters first to add relationships</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {formData.relationships.map((rel, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Relationship {index + 1}</span>
                <button
                  onClick={() => removeRelationship(index)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Character:</label>
                  <select
                    value={rel.characterId}
                    onChange={(e) => updateRelationship(index, 'characterId', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="" className="bg-gray-800">Select a character...</option>
                    {allCharacters
                      .filter(c => c.id !== character?.id) // Don't show current character
                      .map(char => (
                        <option key={char.id} value={char.id} className="bg-gray-800">
                          {char.name}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Relationship:</label>
                  <input
                    type="text"
                    value={rel.relationship}
                    onChange={(e) => updateRelationship(index, 'relationship', e.target.value)}
                    placeholder="e.g., best friend, mentor, rival, sibling..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addRelationship}
            className="w-full py-2 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-400 transition-colors"
            disabled={allCharacters.length === 0}
          >
            <Plus size={16} className="inline mr-2" />
            Add Another Relationship
          </button>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">⚙️ Model Settings</h4>
        <p className="text-xs text-blue-200">
          Fine-tune how this character's AI responds. These settings control creativity, response length, 
          and memory behavior.
        </p>
      </div>

      {/* Response Style Section */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Sliders size={16} />
          Response Style
        </h3>
        
        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">
                Temperature
                <span className="text-xs text-gray-500 ml-2">Creativity level</span>
              </label>
              <span className="text-sm text-purple-400 font-medium">{formData.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused (0.0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">
                Max Response Length
                <span className="text-xs text-gray-500 ml-2">Tokens</span>
              </label>
              <span className="text-sm text-purple-400 font-medium">{formData.max_tokens}</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={formData.max_tokens}
              onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Concise (50)</span>
              <span>Moderate (150)</span>
              <span>Detailed (500)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Management Section */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Brain size={16} />
          Context & Memory
        </h3>
        
        <div className="space-y-4">
          {/* Context Window */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">
                Context Window
                <span className="text-xs text-gray-500 ml-2">Conversation memory size</span>
              </label>
              <span className="text-sm text-purple-400 font-medium">{formData.context_window.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="16000"
              step="1000"
              value={formData.context_window}
              onChange={(e) => handleInputChange('context_window', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Small (2k)</span>
              <span>Medium (8k)</span>
              <span>Large (16k)</span>
            </div>
          </div>

          {/* Memory Toggle */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white mb-1">
                  Character Memory
                </div>
                <p className="text-xs text-gray-400">
                  Remember facts about the user and past conversations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.memory_enabled}
                  onChange={(e) => handleInputChange('memory_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-300 mb-2">💡 Settings Tips</h4>
        <ul className="text-xs text-green-200 space-y-1">
          <li>• Higher temperature = more creative/unpredictable responses</li>
          <li>• More tokens = longer, more detailed responses</li>
          <li>• Larger context window = remembers more conversation history</li>
          <li>• Memory enabled = character learns and remembers about you over time</li>
        </ul>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'basic'
                ? 'text-purple-400 border-purple-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'examples'
                ? 'text-purple-400 border-purple-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Chat Examples
            {formData.chat_examples.length > 0 && (
              <span className="ml-2 bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                {formData.chat_examples.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'relationships'
                ? 'text-purple-400 border-purple-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Relationships
            {formData.relationships.length > 0 && (
              <span className="ml-2 bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                {formData.relationships.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'text-purple-400 border-purple-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'examples' && renderExamplesTab()}
          {activeTab === 'relationships' && renderRelationshipsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
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
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  age: 25,
                  sex: '',
                  personality: '',
                  appearance: '',
                  background: '',
                  avatar: '🤖',
                  color: 'from-gray-500 to-slate-500',
                  avatar_image_url: null,
                  avatar_image_filename: null,
                  uses_custom_image: false,
                  chat_examples: [],
                  relationships: [],
                  tags: [],
                  temperature: 0.7,
                  max_tokens: 150,
                  context_window: 8000,
                  memory_enabled: true
                });
                setValidationErrors({});
                setActiveTab('basic');
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Reset
            </button>
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