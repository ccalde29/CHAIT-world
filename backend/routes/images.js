// backend/routes/images.js
// Routes for image upload and management

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../data/uploads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${req.userId}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
});

module.exports = (db) => {
    /**
     * Upload a new image file
     * POST /api/images/upload
     */
    router.post('/upload', uploadLimiter, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { type = 'character' } = req.body;
            const filename = req.file.filename;
            const url = `/uploads/${filename}`;

            // Map frontend type to database image_type
            const imageTypeMap = {
                'character': 'avatar',
                'persona': 'avatar',
                'scene': 'background'
            };
            const dbImageType = imageTypeMap[type] || 'other';

            // Save metadata to database
            const result = await db.saveImageMetadata(req.userId, {
                filename,
                url,
                type: dbImageType,
                size_bytes: req.file.size
            });

            res.json({
                filename,
                url,
                message: 'Image uploaded successfully'
            });

        } catch (error) {
            console.error('Error uploading image:', error);
            // Clean up uploaded file if database save failed
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Failed to delete uploaded file:', unlinkError);
                }
            }
            res.status(500).json({ error: 'Failed to upload image' });
        }
    });

    /**
     * Update character image
     * PUT /api/characters/:id/image
     */
    router.put('/characters/:id/image', uploadLimiter, async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const result = await db.updateCharacterImage(req.userId, req.params.id, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Character image updated successfully'
            });

        } catch (error) {
            console.error('Error updating character image:', error);
            res.status(500).json({ error: 'Failed to update character image' });
        }
    });

    /**
     * Update user persona image
     * PUT /api/user/persona/image
     */
    router.put('/user/persona/image', uploadLimiter, async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const result = await db.updateUserPersonaImage(req.userId, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Persona image updated successfully'
            });

        } catch (error) {
            console.error('Error updating persona image:', error);
            res.status(500).json({ error: 'Failed to update persona image' });
        }
    });

    /**
     * Update scenario image
     * PUT /api/scenarios/:id/image
     */
    router.put('/scenarios/:id/image', uploadLimiter, async (req, res) => {
        try {
            const { url, filename, useCustomImage } = req.body;

            const defaultScenarios = ['coffee-shop', 'study-group', 'party'];
            if (defaultScenarios.includes(req.params.id)) {
                return res.status(400).json({
                    error: 'Default scenarios cannot have custom backgrounds. Create a custom scenario instead.'
                });
            }

            const result = await db.updateScenarioImage(req.userId, req.params.id, {
                url,
                filename,
                useCustomImage
            });

            res.json({
                ...result,
                message: 'Scene background updated successfully'
            });

        } catch (error) {
            console.error('Error updating scenario image:', error);
            res.status(500).json({ error: 'Failed to update scenario background' });
        }
    });

    /**
     * Delete an image
     * DELETE /api/images/:type/:filename
     */
    router.delete('/:type/:filename', async (req, res) => {
        try {
            const { type, filename } = req.params;

            if (!['character', 'persona', 'scene'].includes(type)) {
                return res.status(400).json({ error: 'Invalid image type' });
            }

            // Delete from database
            await db.deleteImage(req.userId, filename, type);

            // Delete physical file
            const filePath = path.join(__dirname, '../../data/uploads', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            res.json({ message: 'Image deleted successfully' });

        } catch (error) {
            console.error('Error deleting image:', error);
            res.status(500).json({ error: 'Failed to delete image' });
        }
    });

    return router;
};
