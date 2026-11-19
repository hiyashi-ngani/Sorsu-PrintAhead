import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { isAuthorizedSorSUGoogleAccount } from './rules.ts';

let firebaseApp: FirebaseApp | null = null;
function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
}

const app = getFirebaseApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({
  hd: 'sorsu.edu.ph',
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuthListener = (
  onSignedOut?: () => void
) => {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser && !isSigningIn) {
      cachedAccessToken = null;
      onSignedOut?.();
    }
  });
};

export interface GoogleSorSUResult {
  email: string;
  fullName: string;
  accessToken: string;
}

export const signInWithSorSUGoogle = async (): Promise<GoogleSorSUResult> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    const email = (result.user.email || '').trim().toLowerCase();
    const fullName = result.user.displayName || email.split('@')[0];

    if (!isAuthorizedSorSUGoogleAccount(email)) {
      await signOut(auth);
      cachedAccessToken = null;
      throw new Error(
        `Access restricted. "${email || 'Selected account'}" is not an official @sorsu.edu.ph Google account.`
      );
    }

    if (!accessToken) {
      throw new Error('Could not obtain Google sign-in token. Please try again.');
    }

    cachedAccessToken = accessToken;
    return {
      email,
      fullName,
      accessToken,
    };
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in was cancelled.');
    }
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups and try again.');
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => cachedAccessToken;

export const signOutGoogle = async (): Promise<void> => {
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } catch {
    // ignore if not signed in to Firebase
  }
};
