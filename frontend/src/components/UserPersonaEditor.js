/**
 * User Persona Editor Component
 * 
 * Allows users to create and edit their own persona/character that represents
 * them in conversations. This influences how AI characters respond to them.
 */

import React, { useState, useEffect } from 'react';
import { X, User, Palette, Smile, Sparkles, MessageCircle } from 'lucide-react';

const UserPersonaEditor = ({ onSave, onClose, userPersona = null }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    interests: [],
    communication_style: '',
    avatar: '👤',
    color: 'from-blue-500 to-indigo-500'
  });
  
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentInterest, setCurrentInterest] = useState('');

  // Pre-defined color options
  const colorOptions = [
    { name: 'Blue Indigo', value: 'from-blue-500 to-indigo-500' },
    { name: 'Purple Pink', value: 'from-purple-500 to-pink-500' },
    { name: 'Green Teal', value: 'from-green-500 to-teal-500' },
    { name: 'Orange Red', value: 'from-orange-500 to-red-500' },
    { name: 'Yellow Amber', value: 'from-yellow-500 to-amber-500' },
    { name: 'Cyan Blue', value: 'from-cyan-500 to-blue-500' },
    { name: 'Rose Pink', value: 'from-rose-500 to-pink-500' },
    { name: 'Emerald Green', value: 'from-emerald-500 to-green-500' },
    { name: 'Violet Purple', value: 'from-violet-500 to-purple-500' },
    { name: 'Gray Slate', value: 'from-gray-500 to-slate-500' }
  ];

  // Popular emoji options for user avatars
  const emojiOptions = [
    '👤', '🧑', '👩', '👨', '🙂', '😊', '🤓', '😎', '🤔', '✨',
    '🌟', '💫', '🎭', '🎯', '🎸', '📚', '💻', '🎨', '🏃‍♂️', '🧘‍♀️',
    '🌙', '☀️', '🌈', '🔥', '💎', '🦋', '🌺', '🍃', '🎪', '🚀'
  ];

  // Personality templates for user personas
  const personalityTemplates = [
    {
      name: "The Curious Explorer",
      personality: "Always eager to learn new things and explore different perspectives. Asks thoughtful questions and loves discovering connections between ideas. Approaches conversations with genuine curiosity and openness.",
      interests: ["learning", "science", "travel", "culture"],
      communication_style: "inquisitive and engaging"
    },
    {
      name: "The Creative Soul", 
      personality: "Expresses creativity in daily life and sees beauty in unexpected places. Enjoys sharing ideas, stories, and imaginative concepts. Values artistic expression and innovative thinking.",
      interests: ["art", "music", "writing", "design"],
      communication_style: "expressive and imaginative"
    },
    {
      name: "The Practical Advisor",
      personality: "Focuses on realistic solutions and enjoys helping others solve problems. Values efficiency, planning, and getting things done. Brings a grounded perspective to conversations.",
      interests: ["productivity", "planning", "problem-solving", "organization"],
      communication_style: "direct and helpful"
    },
    {
      name: "The Social Connector",
      personality: "Loves meeting new people and building relationships. Energized by social interactions and enjoys bringing others together. Values community, friendship, and shared experiences.",
      interests: ["socializing", "relationships", "community", "events"],
      communication_style: "warm and sociable"
    },
    {
      name: "The Thoughtful Analyst",
      personality: "Enjoys deep thinking and analyzing complex topics. Takes time to consider different angles before responding. Values logic, reasoning, and understanding underlying principles.",
      interests: ["philosophy", "analysis", "research", "debate"],
      communication_style: "reflective and analytical"
    },
    {
      name: "The Empathetic Listener",
      personality: "Naturally attuned to others' emotions and needs. Enjoys providing support and understanding. Values kindness, compassion, and creating safe spaces for authentic conversation.",
      interests: ["psychology", "wellness", "relationships", "mindfulness"],
      communication_style: "supportive and understanding"
    }
  ];

  // Common interests for quick selection
  const commonInterests = [
    "technology", "music", "books", "movies", "gaming", "sports", "travel", 
    "cooking", "art", "science", "philosophy", "fitness", "photography", 
    "writing", "nature", "history", "culture", "learning", "creativity"
  ];

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (userPersona?.hasPersona && userPersona.persona) {
      const persona = userPersona.persona;
      setFormData({
        name: persona.name || '',
        personality: persona.personality || '',
        interests: persona.interests || [],
        communication_style: persona.communication_style || '',
        avatar: persona.avatar || '👤',
        color: persona.color || 'from-blue-500 to-indigo-500'
      });
    } else {
      // Reset to defaults
      setFormData({
        name: '',
        personality: '',
        interests: [],
        communication_style: '',
        avatar: '👤',
        color: 'from-blue-500 to-indigo-500'
      });
    }
    setValidationErrors({});
  }, [userPersona]);

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
      errors.name = 'Your name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Name must be 50 characters or less';
    }
    
    if (!formData.personality.trim()) {
      errors.personality = 'Personality description is required';
    } else if (formData.personality.length < 20) {
      errors.personality = 'Personality description should be at least 20 characters';
    } else if (formData.personality.length > 500) {
      errors.personality = 'Personality description must be 500 characters or less';
    }
    
    if (formData.communication_style && formData.communication_style.length > 100) {
      errors.communication_style = 'Communication style must be 100 characters or less';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      await onSave({
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        interests: formData.interests,
        communication_style: formData.communication_style.trim(),
        avatar: formData.avatar,
        color: formData.color
      });
    } catch (error) {
      console.error('Failed to save user persona:', error);
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      personality: template.personality,
      interests: template.interests,
      communication_style: template.communication_style
    }));
    setValidationErrors({});
  };

  const addInterest = () => {
    if (currentInterest.trim() && !formData.interests.includes(currentInterest.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, currentInterest.trim().toLowerCase()]
      }));
      setCurrentInterest('');
    }
  };

  const removeInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const addCommonInterest = (interest) => {
    if (!formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  const getFieldError = (field) => {
    return validationErrors[field];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <User className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              Your Persona
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
          {/* Persona Preview */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${formData.color} flex items-center justify-center text-2xl`}>
              {formData.avatar}
            </div>
            <div>
              <div className="text-lg font-medium text-white">
                {formData.name || 'Your Name'}
              </div>
              <div className="text-sm text-gray-400">
                {formData.personality ? `${formData.personality.substring(0, 100)}${formData.personality.length > 100 ? '...' : ''}` : 'Your personality description will appear here'}
              </div>
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.interests.slice(0, 5).map((interest, index) => (
                    <span key={index} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {interest}
                    </span>
                  ))}
                  {formData.interests.length > 5 && (
                    <span className="text-xs text-gray-400">+{formData.interests.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-300 mb-2">💡 What is a User Persona?</h4>
            <p className="text-xs text-blue-200">
              Your persona represents how you present yourself in conversations. It helps AI characters understand your personality, interests, and communication style, allowing them to respond more naturally and build better relationships with you over time.
            </p>
          </div>

          {/* Your Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="How would you like to be addressed?"
              maxLength={50}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                getFieldError('name') ? 'border-red-400' : 'border-white/10 focus:border-blue-400'
              }`}
            />
            {getFieldError('name') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('name')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Smile size={16} className="inline mr-2" />
              Avatar
            </label>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
              >
                Current: {formData.avatar} - Click to change
              </button>
            </div>
            
            {showEmojiPicker && (
              <div className="grid grid-cols-10 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
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

          {/* Persona Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Sparkles size={16} className="inline mr-2" />
              Persona Templates (Optional)
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
              placeholder="Describe your personality, how you like to communicate, what motivates you..."
              rows={6}
              maxLength={500}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                getFieldError('personality') ? 'border-red-400' : 'border-white/10 focus:border-blue-400'
              }`}
            />
            {getFieldError('personality') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('personality')}</p>
            )}
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">This helps AI characters understand and respond to you better</p>
              <p className="text-xs text-gray-500">{formData.personality.length}/500 characters</p>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interests & Hobbies
            </label>
            
            {/* Current Interests */}
            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="text-blue-300 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Add Interest */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="Add an interest..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            
            {/* Common Interests */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Common interests:</p>
              <div className="flex flex-wrap gap-1">
                {commonInterests.map((interest, index) => (
                  <button
                    key={index}
                    onClick={() => addCommonInterest(interest)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      formData.interests.includes(interest)
                        ? 'bg-blue-500/30 text-blue-300 cursor-default'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    disabled={formData.interests.includes(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Communication Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MessageCircle size={16} className="inline mr-2" />
              Communication Style (Optional)
            </label>
            <input
              type="text"
              value={formData.communication_style}
              onChange={(e) => handleInputChange('communication_style', e.target.value)}
              placeholder="e.g., casual and friendly, formal and direct, humorous and relaxed..."
              maxLength={100}
              className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                getFieldError('communication_style') ? 'border-red-400' : 'border-white/10 focus:border-blue-400'
              }`}
            />
            {getFieldError('communication_style') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('communication_style')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{formData.communication_style.length}/100 characters</p>
          </div>

          {/* Tips */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-300 mb-2">💡 Persona Tips</h4>
            <ul className="text-xs text-green-200 space-y-1">
              <li>• Be authentic - describe yourself as you really are</li>
              <li>• Include your communication preferences and style</li>
              <li>• Add interests that you'd enjoy discussing</li>
              <li>• This helps characters build better relationships with you</li>
              <li>• You can update your persona anytime as you change</li>
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
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  personality: '',
                  interests: [],
                  communication_style: '',
                  avatar: '👤',
                  color: 'from-blue-500 to-indigo-500'
                });
                setValidationErrors({});
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            >
              {saving ? 'Saving...' : 'Save Persona'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPersonaEditor;