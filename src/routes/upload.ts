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

// Multi-file upload (up to 10 images)
const uploadMultiple = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}.`));
        }
    },
});

// Print file upload — accepts images, PDFs, and Word docs for the Xerox/Print
// service. Unlike product photos, these are NOT resized — print files need
// to stay at full resolution/quality for actual printing.
const printUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB — scans/docs can be bigger
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`Invalid file type: ${file.mimetype}. Only JPG, PNG, PDF, DOC, and DOCX are allowed.`));
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
 * POST /api/upload/multiple
 * Accepts up to 10 image files (field name: "images")
 * Uploads all to Cloudinary → returns array of secure URLs
 */
router.post('/multiple', (req: Request, res: Response): void => {
    uploadMultiple.array('images', 10)(req, res, async (err: any) => {
        if (err) {
            res.status(400).json({ success: false, message: err.message || 'Error uploading files' });
            return;
        }
        try {
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                res.status(500).json({ success: false, message: 'Cloudinary is not configured.' });
                return;
            }
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                res.status(400).json({ success: false, message: 'No image files provided.' });
                return;
            }
            const uploadPromises = files.map(file =>
                new Promise<any>((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'shivkrupa-products', resource_type: 'image', transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }] },
                        (error, result) => { if (error) reject(error); else resolve(result); }
                    );
                    stream.end(file.buffer);
                })
            );
            const results = await Promise.all(uploadPromises);
            res.json({ success: true, urls: results.map(r => r.secure_url), public_ids: results.map(r => r.public_id) });
        } catch (error: any) {
            console.error('Multi-image upload error:', error);
            res.status(500).json({ success: false, message: error.message || 'Upload failed.' });
        }
    });
});

/**
 * POST /api/upload/banner
 * Accepts a single image file (field name: "image"). Unlike product photo
 * uploads, this forces every banner to the exact 21:9 aspect ratio the
 * homepage slideshow uses (1600×686px), with smart auto-cropping — so no
 * matter what shape image the admin uploads, it can never stretch, tear,
 * or crop awkwardly once it hits the live site on any screen size.
 */
router.post('/banner', (req: Request, res: Response): void => {
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

            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'No image file provided. Please upload a file with field name "image".',
                });
                return;
            }

            const result = await new Promise<any>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'shivkrupa-banners',
                        resource_type: 'image',
                        transformation: [
                            { width: 1600, height: 686, crop: 'fill', gravity: 'auto', quality: 'auto:good', fetch_format: 'auto' },
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
            console.error('Banner upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Banner upload failed. Please try again.',
            });
        }
    });
});

/**
 * POST /api/upload/print
 * Accepts up to 20 files (field name: "files"). Uploads each to Cloudinary
 * as resource_type "auto" (images → image storage, PDFs/docs → raw storage)
 * with NO transformation — print files must stay full quality.
 */
router.post('/print', (req: Request, res: Response): void => {
    printUpload.array('files', 20)(req, res, async (err: any) => {
        if (err) {
            res.status(400).json({ success: false, message: err.message || 'Error uploading files' });
            return;
        }
        try {
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                res.status(500).json({ success: false, message: 'Cloudinary is not configured.' });
                return;
            }
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                res.status(400).json({ success: false, message: 'No files provided.' });
                return;
            }

            const results = await Promise.all(files.map(file =>
                new Promise<any>((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'shivkrupa-print-orders',
                            resource_type: 'auto',
                            use_filename: true,
                            unique_filename: true,
                        },
                        (error, result) => { if (error) reject(error); else resolve(result); }
                    );
                    stream.end(file.buffer);
                })
            ));

            const filesOut = results.map((r, i) => ({
                url: r.secure_url,
                public_id: r.public_id,
                resourceType: r.resource_type, // "image" or "raw"
                originalName: files[i].originalname,
                mimeType: files[i].mimetype,
            }));

            res.json({ success: true, files: filesOut });
        } catch (error: any) {
            console.error('Print upload error:', error);
            res.status(500).json({ success: false, message: error.message || 'Upload failed.' });
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
