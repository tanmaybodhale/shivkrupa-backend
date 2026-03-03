import { Router, Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const router = Router();

// Use memory storage — file stays in RAM buffer, never written to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`));
        }
    },
});

/**
 * POST /api/upload
 * Accepts a single image file (field name: "image")
 * Uploads to Cloudinary → returns the secure URL
 */
router.post('/', (req: Request, res: Response): void => {
    upload.single('image')(req, res, async (err: any) => {
        if (err) {
            console.error('Multer error:', err);
            res.status(400).json({
                success: false,
                message: err.message || 'Error uploading file',
            });
            return;
        }

        try {
            // --- Guard: Cloudinary configured? ---
            if (
                !process.env.CLOUDINARY_CLOUD_NAME ||
                !process.env.CLOUDINARY_API_KEY ||
                !process.env.CLOUDINARY_API_SECRET
            ) {
                res.status(500).json({
                    success: false,
                    message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend .env file.',
                });
                return;
            }

            // --- Guard: File received? ---
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'No image file provided. Please upload a file with field name "image".',
                });
                return;
            }

            // --- Upload buffer to Cloudinary ---
            const result = await new Promise<any>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'shivkrupa-products',
                        resource_type: 'image',
                        transformation: [
                            { width: 600, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
                        ],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file!.buffer);
            });

            res.json({
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
            });
        } catch (error: any) {
            console.error('Image upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Image upload failed. Please try again.',
            });
        }
    });
});

/**
 * DELETE /api/upload
 * Deletes an image from Cloudinary by public_id
 */
router.delete('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { public_id } = req.body;

        if (!public_id) {
            res.status(400).json({ success: false, message: 'public_id is required' });
            return;
        }

        await cloudinary.uploader.destroy(public_id);
        res.json({ success: true, message: 'Image deleted from Cloudinary' });
    } catch (error: any) {
        console.error('Image delete error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete image',
        });
    }
});

export default router;
