/**
 * Scene Editor Component
 * 
 * Modal component for managing scenes/locations where characters can chat.
 * Allows creating, editing, and deleting custom scenes with different atmospheres.
 */

import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus, Edit, Trash2, Image, Upload, Eye } from 'lucide-react';
import ImageUpload from './ImageUpload';

const SceneEditor = ({ scenarios, onSave, onDelete, onPublish, onUnpublish, onClose, initialEditingScene = null }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [showCreateForm, setShowCreateForm] = useState(initialEditingScene !== null);
  const [editingScene, setEditingScene] = useState(initialEditingScene);
 
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_message: '',
    atmosphere: '',
    background_image_url: null,
    background_image_filename: null,
    uses_custom_background: false
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form when editing scene is provided
  useEffect(() => {
    if (initialEditingScene) {
      setFormData({
        name: initialEditingScene.name || '',
        description: initialEditingScene.description || '',
        initial_message: initialEditingScene.initial_message || '',
        atmosphere: initialEditingScene.atmosphere || '',
        background_image_url: initialEditingScene.background_image_url || null,
        background_image_filename: initialEditingScene.background_image_filename || null,
        uses_custom_background: initialEditingScene.uses_custom_background || false
      });
    }
  }, [initialEditingScene]);

  // ============================================================================
  // FORM HANDLING
  // ============================================================================
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      initial_message: '',
      atmosphere: '',
      background_image_url: null,
      background_image_filename: null,
      uses_custom_background: false
    });
    setValidationErrors({});
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested fields like 'background.url'
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  
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
    
    if (!formData.initial_message.trim()) {
      errors.initial_message = 'Initial message is required';
    } else if (formData.initial_message.length > 500) {
      errors.initial_message = 'Initial message must be 500 characters or less';
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
    setError(null);

    try {
      const sceneData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        initial_message: formData.initial_message.trim(),
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
      setError(error.message || 'Failed to save scene. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (scene) => {
    setEditingScene(scene);
    setFormData({
      name: scene.name || '',
      description: scene.description || '',
      initial_message: scene.initial_message || '',
      atmosphere: scene.atmosphere || '',
      background_image_url: scene.background_image_url || null,
      background_image_filename: scene.background_image_filename || null,
      uses_custom_background: scene.uses_custom_background || false
    });
    setShowCreateForm(true);
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

              {/* Existing Scenes with Background Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scene) => (
                  <div
                    key={scene.id}
                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition-colors"
                  >
                    {/* Background Image Preview */}
                    {scene.background_image_url && scene.uses_custom_background ? (
                      <div className="h-24 relative">
                        <img 
                          src={scene.background_image_url} 
                          alt={`${scene.name} background`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40"></div>
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-to-r from-purple-500/20 to-blue-500/20"></div>
                    )}
            
                    {/* Scene Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-white">{scene.name}</h3>
                            {scene.is_public && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                Published
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {onPublish && onUnpublish && (
                            <button
                              onClick={() => scene.is_public ? onUnpublish(scene.id) : onPublish(scene.id)}
                              className={`p-1 transition-colors ${
                                scene.is_public
                                  ? 'text-green-400 hover:text-green-300'
                                  : 'text-gray-400 hover:text-green-400'
                              }`}
                              title={scene.is_public ? 'Unpublish from community' : 'Publish to community'}
                            >
                              {scene.is_public ? <Eye size={14} /> : <Upload size={14} />}
                            </button>
                          )}
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
                        <span className="font-medium">Initial Message:</span> {scene.initial_message}
                      </div>
                      {scene.atmosphere && (
                        <div className="text-xs text-purple-300 mt-1">
                          <span className="font-medium">Atmosphere:</span> {scene.atmosphere}
                        </div>
                      )}
                      {scene.uses_custom_background && (
                        <div className="text-xs text-blue-300 mt-1">
                          <span className="font-medium">📸 Custom Background</span>
                        </div>
                      )}
                    </div>
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
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Back to List
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Scene Preview with Background */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <h4 className="text-sm font-medium text-purple-300 mb-2 p-4 pb-0">Preview</h4>
        
                {/* Background Preview */}
                {formData.background_image_url && formData.uses_custom_background ? (
                  <div className="relative h-32 mb-4">
                    <img 
                      src={formData.background_image_url} 
                      alt="Scene background" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-lg font-medium">
                          {formData.name || 'Scene Name'}
                        </div>
                        <div className="text-sm opacity-75">
                          {formData.description || 'Scene description will appear here...'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="text-lg font-medium text-white mb-1">
                      {formData.name || 'Scene Name'}
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      {formData.description || 'Scene description will appear here...'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formData.initial_message || 'Initial message will appear here...'}
                    </div>
                  </div>
                )}
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

              {/* Background Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Image size={16} className="inline mr-2" />
                  Scene Background (Optional)
                </label>
        
                <ImageUpload
                  currentImage={formData.background_image_url}
                  currentEmoji={null} // Not used for scenes
                  onImageChange={(imageData) => {
                    setFormData(prev => ({
                      ...prev,
                      background_image_url: imageData.url,
                      background_image_filename: imageData.filename,
                      uses_custom_background: imageData.useCustomImage
                    }));
                  }}
                  type="scene"
                  aspectRatio="wide"
                />
        
                <div className="mt-2 text-xs text-gray-500">
                  <div className="flex items-start gap-2">
                    <span>💡</span>
                    <div>
                      <p><strong>Background Image Tips:</strong></p>
                      <ul className="mt-1 space-y-1 ml-2">
                        <li>• Use high-quality landscape images (1920x1080 or higher)</li>
                        <li>• Avoid busy images that would distract from conversation</li>
                        <li>• Consider the mood and atmosphere of your scene</li>
                        <li>• Images will be overlaid with semi-transparent chat interface</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Message *
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  This message will be shown at the start of every chat in this scene. Use it to set the atmosphere, describe the setting, or provide context for the conversation. This helps establish the mood and situation for the characters.
                </p>
                <textarea
                  value={formData.initial_message}
                  onChange={(e) => handleInputChange('initial_message', e.target.value)}
                  placeholder="e.g., 'You all meet at the coffee shop on a rainy afternoon. The warm aroma of fresh coffee fills the air as you settle into comfortable chairs by the window.'"
                  rows={4}
                  maxLength={500}
                  className={`w-full bg-white/5 border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none ${
                    getFieldError('initial_message') ? 'border-red-400' : 'border-white/10 focus:border-purple-400'
                  }`}
                />
                {getFieldError('initial_message') && (
                  <p className="text-red-400 text-xs mt-1">{getFieldError('initial_message')}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formData.initial_message.length}/500 characters</p>
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