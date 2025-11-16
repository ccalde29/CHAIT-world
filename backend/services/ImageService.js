// backend/services/ImageService.js
// Handles image upload and management operations

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
}

module.exports = ImageService;
