# ShivKrupa Backend Deployment (Render)

## Render Service Settings

- Runtime: `Node`
- Root Directory: `shivkrupa-backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

## Environment Variables

Set these in Render dashboard:

- `MONGODB_URI`
- `CORS_ORIGINS` (comma-separated frontend URLs, for example `https://your-frontend.onrender.com`)
- `SHOPKEEPER_USERNAME`
- `SHOPKEEPER_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NODE_ENV=production`

Use `.env.example` as reference.

## Notes

- Fake seed route (`POST /api/catalog/seed`) has been removed.
- Product list now comes only from database records.
