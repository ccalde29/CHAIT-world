// backend/services/ImageService.js
// Handles image upload and management operations

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class ImageService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Update character image
     */
    async updateCharacterImage(userId, characterId, imageData) {
        try {
            const updateData = {
                avatar_image_url: imageData.url,
                avatar_image_filename: imageData.filename,
                uses_custom_image: imageData.useCustomImage,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('characters')
                .update(updateData)
                .eq('id', characterId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating character image:', error);
            throw error;
        }
    }

    /**
     * Update user persona image
     */
    async updateUserPersonaImage(userId, imageData) {
        try {
            const { data, error } = await this.supabase
                .from('user_personas')
                .update({
                    avatar_image_url: imageData.url,
                    avatar_image_filename: imageData.filename,
                    uses_custom_image: imageData.useCustomImage,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('is_active', true)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating persona image:', error);
            throw error;
        }
    }

    /**
     * Update scenario background image
     */
    async updateScenarioImage(userId, scenarioId, imageData) {
        try {
            const { data, error } = await this.supabase
                .from('scenarios')
                .update({
                    background_image_url: imageData.url,
                    background_image_filename: imageData.filename,
                    uses_custom_background: imageData.useCustomImage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', scenarioId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Database error updating scenario image:', error);
            throw error;
        }
    }

    /**
     * Delete an image from storage and database
     */
    async deleteImage(userId, filename, type) {
        try {
            const { error: storageError } = await this.supabase.storage
                .from('user-images')
                .remove([`${userId}/${type}/${filename}`]);

            if (storageError) throw storageError;

            const { error: dbError } = await this.supabase
                .from('user_images')
                .delete()
                .eq('user_id', userId)
                .eq('filename', `${userId}/${type}/${filename}`)
                .eq('type', type);

            if (dbError) throw dbError;
            return true;
        } catch (error) {
            console.error('Database error deleting image:', error);
            throw error;
        }
    }

    /**
     * Upload a local image file to Supabase storage
     * Returns the public URL for the uploaded image
     */
    async uploadLocalImageToSupabase(localFilename, bucketName, userId) {
        try {
            // Build the path to the local file
            const localPath = path.join(__dirname, '../../data/uploads', localFilename);
            
            // Check if file exists
            if (!fs.existsSync(localPath)) {
                console.warn(`Local file not found: ${localPath}`);
                return null;
            }

            // Read the file
            const fileBuffer = fs.readFileSync(localPath);
            
            // Determine content type from extension
            const ext = path.extname(localFilename).toLowerCase();
            const contentTypeMap = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.avif': 'image/avif',
                '.svg': 'image/svg+xml'
            };
            const contentType = contentTypeMap[ext] || 'image/jpeg';

            // Generate storage path: userId/filename
            const storagePath = `${userId}/${localFilename}`;

            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from(bucketName)
                .upload(storagePath, fileBuffer, {
                    contentType,
                    upsert: true // Overwrite if exists
                });

            if (uploadError) {
                console.error('Supabase storage upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: publicUrlData } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(storagePath);

            return publicUrlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image to Supabase:', error);
            return null; // Return null instead of throwing to allow publish to continue
        }
    }

    /**
     * Download an image from a URL and save it locally
     * Returns the local filename if successful
     */
    async downloadImageFromUrl(imageUrl, userId) {
        try {
            if (!imageUrl) {
                return null;
            }

            // Generate a unique filename
            const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const filename = `${userId}-${timestamp}-${randomId}${ext}`;
            
            // Ensure uploads directory exists
            const uploadsDir = path.join(__dirname, '../../data/uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const localPath = path.join(uploadsDir, filename);

            // Download the image
            return new Promise((resolve, reject) => {
                const protocol = imageUrl.startsWith('https') ? https : http;
                
                protocol.get(imageUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download image: ${response.statusCode}`));
                        return;
                    }

                    const fileStream = fs.createWriteStream(localPath);
                    response.pipe(fileStream);

                    fileStream.on('finish', () => {
                        fileStream.close();

                        resolve(filename);
                    });

                    fileStream.on('error', (err) => {
                        fs.unlink(localPath, () => {});
                        reject(err);
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error('Error downloading image:', error);
            return null;
        }
    }
}

module.exports = ImageService;
