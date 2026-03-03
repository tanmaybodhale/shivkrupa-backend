import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn(
        '⚠️  Cloudinary credentials missing! Image upload will NOT work.\n' +
        '   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME || '',
    api_key: CLOUDINARY_API_KEY || '',
    api_secret: CLOUDINARY_API_SECRET || '',
});

export default cloudinary;
