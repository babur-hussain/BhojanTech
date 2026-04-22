import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// ─── BhojanTech Firebase Project ─────────────────────────────────────────────
// Project ID : bhojantech-c2aae
// Auth Domain: bhojantech-c2aae.firebaseapp.com
//
// ENV VARS (set in .env):
//   Option A — Full service account JSON (recommended):
//     FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"bhojantech-c2aae",...}'
//
//   Option B — Individual fields:
//     FIREBASE_PROJECT_ID=bhojantech-c2aae
//     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@bhojantech-c2aae.iam.gserviceaccount.com
//     FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
//
// To generate a service account key:
//   Firebase Console → Project Settings → Service Accounts → Generate new private key
// ─────────────────────────────────────────────────────────────────────────────

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
      // Option A: Full JSON blob in env
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        projectId: 'bhojantech-c2aae',
      });
      console.log('[Firebase] ✅ Initialized with service account JSON');
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Option B: Individual credential fields
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'bhojantech-c2aae',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID || 'bhojantech-c2aae',
      });
      console.log('[Firebase] ✅ Initialized with individual credential env vars');
    } else {
      // Fallback: Application Default Credentials (works on GCP / Cloud Run)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'bhojantech-c2aae',
      });
      console.warn('[Firebase] ⚠️  Using Application Default Credentials — set FIREBASE_SERVICE_ACCOUNT_KEY for production');
    }
  } catch (error) {
    console.error('[Firebase] ❌ Initialization error:', error);
  }
}

export const firebaseAdmin = admin;

/** FCM Messaging instance */
export const firebaseMessaging = admin.messaging();

/** Firebase Auth instance */
export const firebaseAuth = admin.auth();

