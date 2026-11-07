import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
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
      if (parsed.uid === 'bahay_local_owner' || parsed.email === 'bahay@billstracker.local') {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
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

/**
 * Dispatches a "Thank You for Using BillsTracker" welcome email notification to the user's Gmail:
 * 1) Sends official Firebase Email Verification/Welcome email via Firebase Auth (`sendEmailVerification`)
 * 2) Queues a rich HTML Welcome & Thank You email in Firestore `mail` collection
 * 3) Triggers local PHP mailer endpoint when XAMPP is active
 */
export async function sendWelcomeGmailNotification(user: AuthUser): Promise<void> {
  const subject = `Thank You for Using BillsTracker, ${user.name}! 🏠✨`;
  const textBody = [
    `Hi ${user.name},`,
    ``,
    `Thank you so much for signing up and using BillsTracker for "${user.householdName}"!`,
    ``,
    `Your household command center is now active and synced in the cloud:`,
    `• Account Email: ${user.email}`,
    `• Household Name: ${user.householdName}`,
    `• Role: ${user.role}`,
    `• App Link: https://billstracker-46723.web.app`,
    ``,
    `You can now track your Bahay Allowance, Palengke & Groceries, Kuryente kWh Bills, Utang Hub, and Audit Logs anytime on your phone or PC.`,
    ``,
    `Maraming salamat po for trusting BillsTracker!`,
    `— The BillsTracker Team`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #140f26; color: #f8fafc; padding: 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.14);">
      <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 22px;">
        Thank You for Using <span style="color: #fbbf24;">BillsTracker</span>! 🎉
      </h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Hi <strong>${user.name}</strong>,<br/><br/>
        Thank you for registering your Gmail (<strong>${user.email}</strong>) on <strong>BillsTracker</strong>! Your household ledger for <strong>${user.householdName}</strong> (${user.role}) is now live and synced.
      </p>
      <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(45,212,191,0.35); border-radius: 14px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0; font-size: 13px; color: #99f6e4;"><strong>✔ 4 Bahay Wallets</strong> (Cash, GCash, Maya, Bank)</p>
        <p style="margin: 4px 0; font-size: 13px; color: #99f6e4;"><strong>✔ Grocery &amp; Kusina Stock</strong></p>
        <p style="margin: 4px 0; font-size: 13px; color: #99f6e4;"><strong>✔ Kuryente kWh &amp; 6-Month Analytics</strong></p>
        <p style="margin: 4px 0; font-size: 13px; color: #99f6e4;"><strong>✔ Utang Hub &amp; Full Audit Trail</strong></p>
      </div>
      <a href="https://billstracker-46723.web.app" style="display: inline-block; background: linear-gradient(90deg, #8b5cf6, #ec4899); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px;">
        Open BillsTracker App →
      </a>
      <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
        Maraming salamat po for choosing BillsTracker!
      </p>
    </div>
  `;

  // 1. Store in Firestore `mail` collection (Firebase Trigger Email format + notification log)
  try {
    await addDoc(collection(firestoreDb, 'mail'), {
      to: [user.email],
      message: {
        subject,
        text: textBody,
        html: htmlBody,
      },
      userUid: user.uid,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // ignore if offline
  }

  // 2. Also trigger local XAMPP PHP mail endpoint if running
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    fetch('http://localhost:8080/api.php?endpoint=send_welcome_email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        householdName: user.householdName,
        subject,
        message: textBody,
      }),
    }).catch(() => {});
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
    // Send official Firebase email notification to their Gmail inbox
    await sendEmailVerification(cred.user).catch(() => {});
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

  // 4. Send "Thank You for Using BillsTracker" Gmail notification
  await sendWelcomeGmailNotification(newUser);

  return newUser;
}

export async function signUpWithGoogleGmail(params?: {
  householdName?: string;
  role?: string;
}): Promise<{ user: AuthUser; isNewUser: boolean }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const cred = await signInWithPopup(firebaseAuth, provider);
  const fbUser = cred.user;
  const cleanEmail = (fbUser.email || '').trim().toLowerCase();
  const emailKey = encodeKey(cleanEmail);
  const localAccounts = loadLocalAccounts();

  let isNewUser = !localAccounts[emailKey];
  let existingRemote: StoredLocalAccount | null = null;

  try {
    const snap = await getDoc(doc(firestoreDb, USERS_COLLECTION, emailKey));
    if (snap.exists()) {
      existingRemote = snap.data() as StoredLocalAccount;
      isNewUser = false;
    }
  } catch {
    // ignore
  }

  const resolvedUser: AuthUser = {
    uid: fbUser.uid,
    name: existingRemote?.name || fbUser.displayName || cleanEmail.split('@')[0] || 'Household Head',
    email: cleanEmail,
    householdName: existingRemote?.householdName || params?.householdName?.trim() || 'Bahay HQ',
    role: existingRemote?.role || params?.role?.trim() || 'Head of House',
    createdAt: existingRemote?.createdAt || new Date().toISOString(),
  };

  const recordToStore: StoredLocalAccount = {
    ...resolvedUser,
    passwordHash: existingRemote?.passwordHash || simpleHash(fbUser.uid),
  };

  localAccounts[emailKey] = recordToStore;
  saveLocalAccounts(localAccounts);
  saveSessionUser(resolvedUser);

  try {
    await setDoc(doc(firestoreDb, USERS_COLLECTION, emailKey), recordToStore, { merge: true });
  } catch {
    // ignore
  }

  if (isNewUser) {
    await sendWelcomeGmailNotification(resolvedUser);
  }

  return { user: resolvedUser, isNewUser };
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

  throw new Error('Account does not exist! You cannot sign in without an account — please Sign Up first.');
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
  return uid ? `user_v2_${uid}` : 'main_bahay_v2_clean';
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
