import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { HouseholdDatabaseState } from '../types/database';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  householdName: string;
  role: string;
  createdAt: string;
}

interface StoredLocalAccount extends AuthUser {
  passwordHash: string;
}

export const firebaseConfig = {
  apiKey: 'AIzaSyATFAKXGI0r2QqsK8NUBPvMftv1JJHKiTY',
  authDomain: 'billstracker-46723.firebaseapp.com',
  projectId: 'billstracker-46723',
  storageBucket: 'billstracker-46723.firebasestorage.app',
  messagingSenderId: '145757335751',
  appId: '1:145757335751:web:f6c246d096910228350ee2',
  measurementId: 'G-5VNWJPYNK9',
};

const app = initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(app);
export const firebaseAuth = getAuth(app);

const HOUSEHOLD_COLLECTION = 'households';
const DEFAULT_HOUSEHOLD_DOC_ID = 'main_bahay_clean';
const USERS_COLLECTION = 'users';

const LOCAL_USERS_KEY = 'bills_tracker_users_v1';
const LOCAL_SESSION_KEY = 'bills_tracker_session_v1';

function encodeKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `bt_${(h >>> 0).toString(16)}`;
}

function loadLocalAccounts(): Record<string, StoredLocalAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredLocalAccount>;
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts: Record<string, StoredLocalAccount>): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage errors
  }
}

export function getSavedSessionUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && parsed.uid && parsed.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSessionUser(user: AuthUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    } else {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
    }
  } catch {
    // ignore
  }
}

export async function registerAccount(params: {
  name: string;
  email: string;
  password: string;
  householdName: string;
  role: string;
}): Promise<AuthUser> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim() || 'Household Member';
  const cleanHousehold = params.householdName.trim() || 'Bahay HQ';
  const cleanRole = params.role.trim() || 'Head of House';
  const emailKey = encodeKey(cleanEmail);
  const pwdHash = simpleHash(params.password);
  const nowIso = new Date().toISOString();

  // Check if local account already exists
  const localAccounts = loadLocalAccounts();
  if (localAccounts[emailKey]) {
    throw new Error('An account with this email already exists. Please Log In instead.');
  }

  let uid = `usr_${emailKey}`;

  // 1. Try Firebase Auth first
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, params.password);
    uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please switch to Log In.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    // If auth/configuration-not-found or auth/operation-not-allowed or network error,
    // gracefully continue with Firestore + localStorage hybrid profile!
  }

  const newUser: AuthUser = {
    uid,
    name: cleanName,
    email: cleanEmail,
    householdName: cleanHousehold,
    role: cleanRole,
    createdAt: nowIso,
  };

  const recordToStore: StoredLocalAccount = {
    ...newUser,
    passwordHash: pwdHash,
  };

  // 2. Save to localStorage registry & active session
  localAccounts[emailKey] = recordToStore;
  saveLocalAccounts(localAccounts);
  saveSessionUser(newUser);

  // 3. Sync user profile to Firestore `users` collection
  try {
    const userDocRef = doc(firestoreDb, USERS_COLLECTION, emailKey);
    await setDoc(userDocRef, recordToStore, { merge: true });
  } catch {
    // Offline or rules fallback
  }

  return newUser;
}

export async function loginAccount(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  const emailKey = encodeKey(cleanEmail);
  const pwdHash = simpleHash(password);
  const localAccounts = loadLocalAccounts();

  // 1. Try Firebase Auth first
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
    const fbUser = cred.user;

    // Fetch rich profile from Firestore or local registry
    let profile: AuthUser | null = localAccounts[emailKey] || null;
    try {
      const snap = await getDoc(doc(firestoreDb, USERS_COLLECTION, emailKey));
      if (snap.exists()) {
        const data = snap.data() as StoredLocalAccount;
        profile = {
          uid: data.uid || fbUser.uid,
          name: data.name || fbUser.displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
          householdName: data.householdName || 'Bahay HQ',
          role: data.role || 'Head of House',
          createdAt: data.createdAt || new Date().toISOString(),
        };
      }
    } catch {
      // ignore Firestore fetch error
    }

    const resolvedUser: AuthUser = profile || {
      uid: fbUser.uid,
      name: fbUser.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      householdName: 'Bahay HQ',
      role: 'Head of House',
      createdAt: new Date().toISOString(),
    };

    localAccounts[emailKey] = { ...resolvedUser, passwordHash: pwdHash };
    saveLocalAccounts(localAccounts);
    saveSessionUser(resolvedUser);
    return resolvedUser;
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      // Still check Firestore/local in case the account was created while Auth provider was disabled
    }
  }

  // 2. Check Firestore `users` collection
  try {
    const snap = await getDoc(doc(firestoreDb, USERS_COLLECTION, emailKey));
    if (snap.exists()) {
      const remoteAcc = snap.data() as StoredLocalAccount;
      if (remoteAcc.passwordHash === pwdHash) {
        const user: AuthUser = {
          uid: remoteAcc.uid,
          name: remoteAcc.name,
          email: remoteAcc.email,
          householdName: remoteAcc.householdName || 'Bahay HQ',
          role: remoteAcc.role || 'Head of House',
          createdAt: remoteAcc.createdAt,
        };
        localAccounts[emailKey] = remoteAcc;
        saveLocalAccounts(localAccounts);
        saveSessionUser(user);
        return user;
      } else {
        throw new Error('Incorrect password. Please double-check and try again.');
      }
    }
  } catch (e: any) {
    if (e?.message?.includes('Incorrect password')) {
      throw e;
    }
  }

  // 3. Check localStorage registry
  const localAcc = localAccounts[emailKey];
  if (localAcc) {
    if (localAcc.passwordHash !== pwdHash) {
      throw new Error('Incorrect password. Please double-check and try again.');
    }
    const user: AuthUser = {
      uid: localAcc.uid,
      name: localAcc.name,
      email: localAcc.email,
      householdName: localAcc.householdName,
      role: localAcc.role,
      createdAt: localAcc.createdAt,
    };
    saveSessionUser(user);
    return user;
  }

  throw new Error('No account found for this email. Switch to Sign Up to create yours!');
}

export async function logoutAccount(): Promise<void> {
  saveSessionUser(null);
  try {
    await signOut(firebaseAuth);
  } catch {
    // ignore
  }
}

function resolveHouseholdDocId(userUid?: string): string {
  const session = getSavedSessionUser();
  const uid = userUid || session?.uid;
  return uid ? `user_${uid}` : DEFAULT_HOUSEHOLD_DOC_ID;
}

export async function syncStateToFirebase(
  state: HouseholdDatabaseState,
  userUid?: string
): Promise<void> {
  try {
    const docId = resolveHouseholdDocId(userUid);
    const docRef = doc(firestoreDb, HOUSEHOLD_COLLECTION, docId);
    await setDoc(docRef, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Silent fallback when offline or before Firestore is enabled in console
  }
}

export async function fetchStateFromFirebase(
  userUid?: string
): Promise<Partial<HouseholdDatabaseState> | null> {
  try {
    const docId = resolveHouseholdDocId(userUid);
    const docRef = doc(firestoreDb, HOUSEHOLD_COLLECTION, docId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as Partial<HouseholdDatabaseState>;
    }
    return null;
  } catch {
    return null;
  }
}
