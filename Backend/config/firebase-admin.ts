import * as admin from 'firebase-admin';

let firebaseAdminApp: any = null;
let isFirebaseConfigured = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle escaped newlines in private key if loaded from env
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    firebaseAdminApp = (admin as any).initializeApp({
      credential: (admin as any).credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isFirebaseConfigured = true;
    console.log("Firebase Admin SDK successfully initialized.");
  } else {
    console.warn("Firebase Admin environment variables missing. Firebase verification will run in MOCK/FALLBACK mode.");
  }
} catch (err) {
  console.error("Error initializing Firebase Admin SDK:", err);
}

export { firebaseAdminApp, isFirebaseConfigured };
