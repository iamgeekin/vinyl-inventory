import { FirebaseError, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { createFirestoreRepo } from './data/firestoreRepo';
import type { Repository } from './data/repository';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

export interface CloudSession {
  uid: string;
  email: string;
  repo: Repository;
  signOut: () => Promise<void>;
}

export function watchSession(onChange: (session: CloudSession | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    onChange(
      user && {
        uid: user.uid,
        email: user.email ?? 'your account',
        repo: createFirestoreRepo(db, user.uid),
        signOut: () => signOut(auth),
      },
    );
  });
}

// A popup, because redirect sign-in is unreliable when the app is not served by Firebase Hosting.
export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const createAccount = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'The email or password is not right.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Use a password of at least 6 characters.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/admin-restricted-operation': 'New sign-ups are turned off for this collection.',
  'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
  'auth/popup-blocked': 'The Google window was blocked. Allow pop-ups, or sign in with email.',
  'auth/operation-not-supported-in-this-environment': 'Google sign-in does not work here. Sign in with email instead.',
  'auth/unauthorized-domain': 'This web address is not in the Firebase authorised domains list.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
  'auth/network-request-failed': 'No connection to the sign-in service.',
  'auth/too-many-requests': 'Too many attempts. Wait a while and try again.',
};

export function authMessage(error: unknown): string {
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? `Sign-in failed (${error.code}).`;
  return 'Sign-in failed. Try again.';
}
