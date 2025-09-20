/**
 * Image Upload Component
 * 
 * Handles image upload for characters and personas with preview,
 * validation, and Supabase storage integration
 */

import React, { useState, useRef } from 'react';
import { Upload, X, Image, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ImageUpload = ({ 
  currentImage, 
  currentEmoji, 
  onImageChange, 
  onEmojiChange, 
  userId, 
  type = 'character', // 'character', 'persona', or 'scene'
  className = "",
  aspectRatio = 'square' // 'square' for avatars, 'wide' for scene backgrounds
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentImage);
  const [useCustomImage, setUseCustomImage] = useState(!!currentImage);
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = type === 'scene' ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for scenes, 5MB for avatars

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }

    if (file.size > maxSize) {
      const maxSizeMB = type === 'scene' ? '10MB' : '5MB';
      return `Image must be smaller than ${maxSizeMB}`;
    }

    return null;
  };

  // Get storage bucket based on type
  const getStorageBucket = () => {
    switch (type) {
      case 'scene':
        return 'scene-backgrounds';
      case 'character':
      case 'persona':
      default:
        return 'character-avatars';
    }
  };

  // Generate unique filename
  const generateFilename = (file) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop();
    return `${userId}/${type}_${timestamp}_${randomId}.${extension}`;
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);

      // Generate filename
      const filename = generateFilename(file);

      // Upload to Supabase Storage
      const bucket = getStorageBucket();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      // Update parent component
      onImageChange({
        url: publicUrl,
        filename: filename,
        useCustomImage: true
      });

      setUseCustomImage(true);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload image: ' + error.message);
      setPreviewUrl(currentImage);
    } finally {
      setUploading(false);
    }
  };

  // Remove custom image
  const removeCustomImage = async () => {
    if (currentImage && onImageChange) {
      try {
        // Delete from storage if we have a filename
        const filename = currentImage.split('/').pop();
        if (filename) {
          const bucket = getStorageBucket();
          await supabase.storage
            .from(bucket)
            .remove([`${userId}/${filename}`]);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Reset to emoji/default
    setUseCustomImage(false);
    setPreviewUrl(null);
    onImageChange({
      url: null,
      filename: null,
      useCustomImage: false
    });
  };

  // Get preview dimensions based on aspect ratio
  const getPreviewClasses = () => {
    if (type === 'scene') {
      return 'w-48 h-32 rounded-lg'; // 3:2 aspect ratio for scenes
    }
    return 'w-24 h-24 rounded-full'; // Square for avatars
  };

  // Get upload prompt text
  const getUploadPromptText = () => {
    switch (type) {
      case 'scene':
        return {
          main: 'Click to upload a background image',
          sub: 'PNG, JPG, WebP up to 10MB'
        };
      case 'character':
        return {
          main: 'Click to upload an avatar',
          sub: 'PNG, JPG, GIF up to 5MB'
        };
      case 'persona':
        return {
          main: 'Click to upload your avatar',
          sub: 'PNG, JPG, GIF up to 5MB'
        };
      default:
        return {
          main: 'Click to upload an image',
          sub: 'PNG, JPG, GIF up to 5MB'
        };
    }
  };

  // Toggle between emoji and image
  const toggleImageMode = () => {
    setUseCustomImage(!useCustomImage);
    if (useCustomImage) {
      // Switching to emoji
      onImageChange({
        url: null,
        filename: null,
        useCustomImage: false
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle - Only show for avatars, not scenes */}
      {type !== 'scene' && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => toggleImageMode()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              !useCustomImage 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg">😊</span>
            <span className="text-sm">Emoji</span>
          </button>

          <button
            type="button"
            onClick={() => toggleImageMode()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              useCustomImage 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Image size={16} />
            <span className="text-sm">Custom Image</span>
          </button>
        </div>
      )}

      {!useCustomImage && type !== 'scene' ? (
        /* Emoji Mode - Only for avatars */
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Current Emoji Avatar
          </label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
              {currentEmoji}
            </div>
            <div className="text-sm text-gray-400">
              You can change the emoji in the avatar section above
            </div>
          </div>
        </div>
      ) : (
        /* Custom Image Mode */
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {type === 'scene' ? 'Scene Background Image' : 'Custom Avatar Image'}
          </label>

          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              uploading 
                ? 'border-purple-400 bg-purple-500/10' 
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            {previewUrl ? (
              /* Image Preview */
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt={type === 'scene' ? 'Scene background preview' : 'Avatar preview'} 
                  className={`${getPreviewClasses()} mx-auto object-cover`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomImage();
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              /* Upload Prompt */
              <div>
                {uploading ? (
                  <div className="space-y-2">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-purple-300">Uploading...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-300">{getUploadPromptText().main}</p>
                    <p className="text-xs text-gray-500">{getUploadPromptText().sub}</p>
                  </div>
                )}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Error Display */}
          {uploadError && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/20 border border-red-500/30 rounded px-3 py-2">
              {uploadError}
            </div>
          )}

          {/* Upload Instructions */}
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <span>💡</span>
              <div>
                <p><strong>Tips for best results:</strong></p>
                <ul className="mt-1 space-y-1 ml-2">
                  {type === 'scene' ? (
                    <>
                      <li>• Use landscape images (16:9 or 3:2 ratio) for best fit</li>
                      <li>• High resolution images (1920x1080 or higher) look better</li>
                      <li>• Avoid busy backgrounds that make text hard to read</li>
                      <li>• Consider lighting and mood that matches your scene</li>
                    </>
                  ) : (
                    <>
                      <li>• Use square images (1:1 ratio) for best fit</li>
                      <li>• High contrast images work better</li>
                      <li>• Face should be clearly visible</li>
                      <li>• Avoid overly complex backgrounds</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;