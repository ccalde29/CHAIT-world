/**
 * Scene Editor Component
 * 
 * Modal component for managing scenes/locations where characters can chat.
 * Allows creating, editing, and deleting custom scenes with different atmospheres.
 */

import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus, Edit, Trash2, Sparkles } from 'lucide-react';

const SceneEditor = ({ scenarios, onSave, onDelete, onClose }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingScene, setEditingScene] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    context: '',
    atmosphere: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Scene templates for inspiration
  const sceneTemplates = [
    {
      name: "Cozy Bookstore",
      description: "A quiet bookstore with warm lighting and the smell of old books",
      context: "The group is browsing books and having quiet conversations among the shelves of a cozy independent bookstore.",
      atmosphere: "intimate and intellectual"
    },
    {
      name: "Rooftop Bar",
      description: "An upscale rooftop bar with city views and ambient music",
      context: "The group is enjoying drinks on a rooftop bar with panoramic city views and a sophisticated atmosphere.",
      atmosphere: "sophisticated and relaxed"
    },
    {
      name: "Gaming Arcade",
      description: "A retro arcade filled with flashing lights and electronic sounds",
      context: "The group is hanging out at a bustling arcade, playing games and chatting between rounds.",
      atmosphere: "energetic and nostalgic"
    },
    {
      name: "Art Gallery Opening",
      description: "An elegant gallery opening with wine and artistic discussions",
      context: "The group is mingling at an art gallery opening, discussing the artwork and enjoying wine and hors d'oeuvres.",
      atmosphere: "cultured and creative"
    },
    {
      name: "Beach Bonfire",
      description: "A nighttime gathering around a bonfire on the beach",
      context: "The group is sitting around a crackling bonfire on the beach under the stars, sharing stories and marshmallows.",
      atmosphere: "relaxed and intimate"
    },
    {
      name: "Food Truck Festival",
      description: "A vibrant outdoor festival with diverse food options",
      context: "The group is exploring a food truck festival, trying different cuisines and people-watching in the lively crowd.",
      atmosphere: "casual and diverse"
    },
    {
      name: "Escape Room",
      description: "A challenging puzzle room where teamwork is essential",
      context: "The group is working together to solve puzzles and escape from a themed room within the time limit.",
      atmosphere: "intense and collaborative"
    },
    {
      name: "Hiking Trail",
      description: "A scenic nature trail with beautiful views and fresh air",
      context: "The group is hiking along a scenic trail, enjoying nature and having conversations while walking.",
      atmosphere: "peaceful and invigorating"
    }
  ];

  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      context: '',
      atmosphere: ''
    });
    setValidationErrors({});
  };

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
      errors.name = 'Scene name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Scene name must be 50 characters or less';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Scene description is required';
    } else if (formData.description.length > 200) {
      errors.description = 'Description must be 200 characters or less';
    }
    
    if (!formData.context.trim()) {
      errors.context = 'Scene context is required';
    } else if (formData.context.length > 300) {
      errors.context = 'Context must be 300 characters or less';
    }
    
    if (formData.atmosphere && formData.atmosphere.length > 100) {
      errors.atmosphere = 'Atmosphere must be 100 characters or less';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      const sceneData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        context: formData.context.trim(),
        atmosphere: formData.atmosphere.trim() || 'neutral'
      };
      
      if (editingScene) {
        sceneData.id = editingScene.id;
      }
      
      await onSave(sceneData);
      resetForm();
      setShowCreateForm(false);
      setEditingScene(null);
    } catch (error) {
      console.error('Failed to save scene:', error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (scene) => {
    setEditingScene(scene);
    setFormData({
      name: scene.name || '',
      description: scene.description || '',
      context: scene.context || '',
      atmosphere: scene.atmosphere || ''
    });
    setShowCreateForm(true);
  };

  const applyTemplate = (template) => {
    setFormData({
      name: template.name,
      description: template.description,
      context: template.context,
      atmosphere: template.atmosphere
    });
    setValidationErrors({});
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
            <MapPin className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">
              Manage Scenes & Locations
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
        <div className="p-6">
          {!showCreateForm ? (
            // Scene List View
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-300">
                  Create and customize the locations where your characters can chat.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(true);
                  }}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create Scene
                </button>
              </div>

              {/* Existing Scenes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scene) => (
                  <div
                    key={scene.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-white">{scene.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(scene)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Edit scene"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${scene.name}" scene?`)) {
                              onDelete(scene.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete scene"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{scene.description}</p>
                    <div className="text-xs text-gray-400">
                      <span className="font-medium">Context:</span> {scene.context}
                    </div>
                    {scene.atmosphere && (
                      <div className="text-xs text-purple-300 mt-1">
                        <span className="font-medium">Atmosphere:</span> {scene.atmosphere}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Create/Edit Form
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">
                  {editingScene ? 'Edit Scene' : 'Create New Scene'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingScene(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Back to List
                </button>
              </div>

              {/* Scene Preview */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-300 mb-2">Preview</h4>
                <div className="text-lg font-medium text-white mb-1">
                  {formData.name || 'Scene Name'}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  {formData.description || 'Scene description will appear here...'}
                </div>
                <div className="text-xs text-gray-400">
                  {formData.context || 'Scene context for AI characters...'}
                </div>
              </div>

              {/* Scene Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scene Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter scene name"
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

              {/* Scene Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the location"
                  maxLength={200}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                    getFieldError('description') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                  }`}
                />
                {getFieldError('description') && (
                  <p className="text-red-400 text-xs mt-1">{getFieldError('description')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/200 characters</p>
              </div>

              {/* Scene Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Sparkles size={16} className="inline mr-2" />
                  Scene Templates (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {sceneTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => applyTemplate(template)}
                      className="p-3 text-left bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="text-sm font-medium text-white mb-1">{template.name}</div>
                      <div className="text-xs text-gray-400">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scene Context */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Context for AI Characters *
                </label>
                <textarea
                  value={formData.context}
                  onChange={(e) => handleInputChange('context', e.target.value)}
                  placeholder="Describe the setting and situation for AI characters. This helps them understand how to behave in this scene."
                  rows={4}
                  maxLength={300}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                    getFieldError('context') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                  }`}
                />
                {getFieldError('context') && (
                  <p className="text-red-400 text-xs mt-1">{getFieldError('context')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.context.length}/300 characters</p>
              </div>

              {/* Atmosphere */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Atmosphere (Optional)
                </label>
                <input
                  type="text"
                  value={formData.atmosphere}
                  onChange={(e) => handleInputChange('atmosphere', e.target.value)}
                  placeholder="e.g., relaxed and friendly, energetic and social, intimate and cozy"
                  maxLength={100}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none ${
                    getFieldError('atmosphere') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                  }`}
                />
                {getFieldError('atmosphere') && (
                  <p className="text-red-400 text-xs mt-1">{getFieldError('atmosphere')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.atmosphere.length}/100 characters</p>
              </div>

              {/* Tips */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Scene Creation Tips</h4>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Be specific about the physical environment and ambiance</li>
                  <li>• Include sensory details (sounds, smells, lighting)</li>
                  <li>• Consider how the setting affects conversation style</li>
                  <li>• Think about what activities might be happening</li>
                  <li>• The context helps AI characters understand the situation</li>
                </ul>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingScene(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  {saving ? 'Saving...' : editingScene ? 'Update Scene' : 'Create Scene'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneEditor;