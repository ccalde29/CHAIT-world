/**
 * ImageUpload Component
 * 
 * Handles image uploads to Supabase storage with preview and management
 */

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ImageUpload = ({ 
  currentImage, 
  currentEmoji, 
  onImageChange, 
  type = 'character', 
  aspectRatio = 'square' 
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [useCustomImage, setUseCustomImage] = useState(!!currentImage);

  // Update useCustomImage when currentImage changes
  React.useEffect(() => {
    setUseCustomImage(!!currentImage);
  }, [currentImage]);

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    await uploadImage(file);
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file) => {
    if (!user) {
      setError('You must be logged in to upload images');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Save image metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('user_images')
        .insert({
          user_id: user.id,
          filename: fileName,
          url: imageUrl,
          type: type,
          size_bytes: file.size
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Update parent component
      onImageChange({
        url: imageUrl,
        filename: fileName,
        useCustomImage: true
      });

      setUseCustomImage(true);

    } catch (error) {
      console.error('Upload error:', error);
      setError(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Remove current image
    const handleRemoveImage = async () => {
      if (!currentImage) return;

      try {
        // Delete from storage if it's a custom uploaded image
        if (currentImage.includes('user-images/')) {
          // Extract the filename from the URL
          const urlParts = currentImage.split('/user-images/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1];
            
            const { error: storageError } = await supabase.storage
              .from('user-images')
              .remove([fileName]);

            if (storageError) {
              console.error('Storage deletion error:', storageError);
              // Continue anyway - the database cleanup is more important
            }

            // Delete from database
            const { error: dbError } = await supabase
              .from('user_images')
              .delete()
              .eq('url', currentImage)
              .eq('user_id', user.id);

            if (dbError) {
              console.error('Database deletion error:', dbError);
              // Continue anyway - the main goal is to update the UI
            }
          }
        }

        // Update parent component
        onImageChange({
          url: null,
          filename: null,
          useCustomImage: false
        });

        setUseCustomImage(false);
        setError(null);

      } catch (error) {
        console.error('Remove error:', error);
        setError(`Failed to remove image: ${error.message}`);
      }
    };

  // Handle switching to emoji/no background mode
  const handleSwitchToEmoji = () => {
    setUseCustomImage(false);
    onImageChange({
      url: null,
      filename: null,
      useCustomImage: false
    });
    setError(null);
  };

  // Handle switching to custom image mode
  const handleSwitchToCustomImage = () => {
    setUseCustomImage(true);
    // Don't immediately call onImageChange here - wait for actual upload
  };

  return (
    <div className="space-y-3">
      {/* Toggle Controls */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`${type}-image-mode`}
            checked={!useCustomImage}
            onChange={handleSwitchToEmoji}
            className="text-purple-500 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">
            {type === 'scene' ? 'No Background' : 'Use Emoji'}
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`${type}-image-mode`}
            checked={useCustomImage}
            onChange={handleSwitchToCustomImage}
            className="text-purple-500 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">Custom Image</span>
        </label>
      </div>

      {/* Image Upload/Preview Area */}
      {useCustomImage && (
        <div className="space-y-3">
          {/* Current Image Preview */}
          {currentImage ? (
            <div className="relative">
              <div className={`relative overflow-hidden rounded-lg border border-white/20 ${
                aspectRatio === 'wide' ? 'aspect-video max-w-md' : 'aspect-square w-32'
              }`}>
                <img
                  src={currentImage}
                  alt={`${type} preview`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={handleRemoveImage}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Remove image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Replace Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                Replace Image
              </button>
            </div>
          ) : (
            /* Upload Area */
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-colors ${
                aspectRatio === 'wide' ? 'aspect-video max-w-md' : 'aspect-square w-32'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
                  <p className="text-sm text-gray-400">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Upload className="text-gray-400 mb-2" size={24} />
                  <p className="text-sm text-gray-400 mb-1">Click to upload</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        {type === 'character' && (
          <p>Custom images work best as square photos (profile pictures, portraits, etc.)</p>
        )}
        {type === 'scene' && (
          <p>Background images work best as landscape photos that set the mood for conversations.</p>
        )}
        {type === 'persona' && (
          <p>Choose an image that represents you in conversations with AI characters.</p>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
