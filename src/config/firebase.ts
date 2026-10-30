import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// A separate named app, so it can't clash with the push-notification Firebase setup
const APP_NAME = 'phone-auth';

// Env is read lazily because dotenv.config() runs after imports in index.ts
export function firebaseAuth() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  const app: App =
    existing ??
    initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      },
      APP_NAME
    );
  return getAuth(app);
}
