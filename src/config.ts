const env = import.meta.env;

/** Public web-app identifiers from the Firebase console. Access is controlled by the security rules. */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** Without a full Firebase config the app runs in demo mode on this device only. */
export const cloudEnabled = Object.values(firebaseConfig).every(Boolean);
