const env = import.meta.env;

/** Public web-app identifiers from the Firebase console. Access is controlled by the security rules. */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** Without a full Firebase config, records stay on the device and syncing is not offered. */
export const cloudEnabled = Object.values(firebaseConfig).every(Boolean);
