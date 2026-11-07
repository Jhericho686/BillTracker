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
const LOGIN_ATTEMPTS_KEY = 'bills_tracker_login_attempts_v1';
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

interface LoginAttemptRecord {
  count: number;
  lockedUntil: number;
}

interface SignedSessionEnvelope {
  user: AuthUser;
  issuedAt: number;
  expiresAt: number;
  sessionSig: string;
}

/**
 * Strict XSS & injection sanitization for user-provided text fields
 */
export function sanitizeInput(raw: string, maxLength = 120): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export const sanitizeText = sanitizeInput;

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

/**
 * Cryptographic SHA-256 salted password hash via Web Crypto API with deterministic fallback
 */
export async function hashPasswordSecure(email: string, password: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const saltedPayload = `billstracker_salt_v2::${cleanEmail}::${password}`;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(saltedPayload);
      const digestBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `sha256_${hashHex}`;
    }
  } catch {
    // Fallback if subtle crypto is unavailable in non-secure context
  }
  return `sha256_fb_${simpleHash(saltedPayload)}`;
}

function computeSessionSignature(user: AuthUser, issuedAt: number, expiresAt: number): string {
  const payload = `bt_sig_v2|${user.uid}|${user.email}|${user.role}|${issuedAt}|${expiresAt}`;
  return simpleHash(payload);
}

function loadLoginAttempts(): Record<string, LoginAttemptRecord> {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LoginAttemptRecord>;
  } catch {
    return {};
  }
}

function saveLoginAttempts(records: Record<string, LoginAttemptRecord>): void {
  try {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

function checkBruteForceLock(emailKey: string): void {
  const records = loadLoginAttempts();
  const entry = records[emailKey];
  if (!entry) return;
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSec = Math.ceil((entry.lockedUntil - now) / 1000);
    throw new Error(
      `Too many failed login attempts. Account locked for ${remainingSec} seconds for your security.`
    );
  }
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    delete records[emailKey];
    saveLoginAttempts(records);
  }
}

function recordFailedLoginAttempt(emailKey: string): void {
  const records = loadLoginAttempts();
  const now = Date.now();
  const current = records[emailKey] || { count: 0, lockedUntil: 0 };
  const nextCount = current.count + 1;
  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    records[emailKey] = {
      count: nextCount,
      lockedUntil: now + LOCKOUT_DURATION_MS,
    };
    saveLoginAttempts(records);
    throw new Error(
      `Too many failed login attempts. Account locked for 60 seconds for your security.`
    );
  } else {
    records[emailKey] = {
      count: nextCount,
      lockedUntil: 0,
    };
    saveLoginAttempts(records);
  }
}

function clearLoginAttempts(emailKey: string): void {
  const records = loadLoginAttempts();
  if (records[emailKey]) {
    delete records[emailKey];
    saveLoginAttempts(records);
  }
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
    const parsed = JSON.parse(raw);

    // Check if signed envelope format
    if (parsed && typeof parsed === 'object' && 'user' in parsed && 'sessionSig' in parsed) {
      const env = parsed as SignedSessionEnvelope;
      const now = Date.now();
      if (!env.user || !env.user.uid || !env.user.email) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      if (env.expiresAt && now > env.expiresAt) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      const expectedSig = computeSessionSignature(env.user, env.issuedAt, env.expiresAt);
      if (env.sessionSig !== expectedSig) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      if (
        env.user.uid === 'bahay_local_owner' ||
        env.user.email === 'bahay@billstracker.local'
      ) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      return env.user;
    }

    // Legacy unsigned session migration: validate and re-save with signature
    const legacy = parsed as AuthUser;
    if (legacy && legacy.uid && legacy.email) {
      if (legacy.uid === 'bahay_local_owner' || legacy.email === 'bahay@billstracker.local') {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      saveSessionUser(legacy);
      return legacy;
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
      const sanitizedUser: AuthUser = {
        uid: sanitizeInput(user.uid, 128),
        name: sanitizeInput(user.name, 80) || 'Household Member',
        email: sanitizeInput(user.email, 120).toLowerCase(),
        householdName: sanitizeInput(user.householdName, 80) || 'Bahay HQ',
        role: sanitizeInput(user.role, 50) || 'Head of House',
        createdAt: user.createdAt || new Date().toISOString(),
      };
      const issuedAt = Date.now();
      const expiresAt = issuedAt + SESSION_MAX_AGE_MS;
      const envelope: SignedSessionEnvelope = {
        user: sanitizedUser,
        issuedAt,
        expiresAt,
        sessionSig: computeSessionSignature(sanitizedUser, issuedAt, expiresAt),
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(envelope));
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

  // 2. Direct HTTPS Email Relay (FormSubmit AJAX) to the user's Gmail + Admin notification
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(user.email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        App: 'BillsTracker — Smart Household Budget & Utang Center',
        Message: `Thank you for using BillsTracker, ${user.name}! Your household ledger (${user.householdName} • ${user.role}) is now active at https://billstracker-46723.web.app`,
        Household: user.householdName,
        Role: user.role,
        RegisteredEmail: user.email,
      }),
    }).catch(() => {});

    // 3. Also trigger local XAMPP PHP mail endpoint if running
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
  const cleanEmail = sanitizeInput(params.email, 120).toLowerCase();
  const cleanName = sanitizeInput(params.name, 80) || 'Household Member';
  const cleanHousehold = sanitizeInput(params.householdName, 80) || 'Bahay HQ';
  const cleanRole = sanitizeInput(params.role, 50) || 'Head of House';
  const emailKey = encodeKey(cleanEmail);
  const pwdHash = await hashPasswordSecure(cleanEmail, params.password);
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
  clearLoginAttempts(emailKey);
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
  const cleanEmail = sanitizeInput(fbUser.email || '', 120).toLowerCase();
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
    name: sanitizeInput(
      existingRemote?.name || fbUser.displayName || cleanEmail.split('@')[0] || 'Household Head',
      80
    ),
    email: cleanEmail,
    householdName: sanitizeInput(
      existingRemote?.householdName || params?.householdName || 'Bahay HQ',
      80
    ),
    role: sanitizeInput(existingRemote?.role || params?.role || 'Head of House', 50),
    createdAt: existingRemote?.createdAt || new Date().toISOString(),
  };

  const defaultGoogleHash = await hashPasswordSecure(cleanEmail, fbUser.uid);
  const recordToStore: StoredLocalAccount = {
    ...resolvedUser,
    passwordHash: existingRemote?.passwordHash || defaultGoogleHash,
  };

  localAccounts[emailKey] = recordToStore;
  saveLocalAccounts(localAccounts);
  clearLoginAttempts(emailKey);
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
  const cleanEmail = sanitizeInput(email, 120).toLowerCase();
  const emailKey = encodeKey(cleanEmail);

  // Enforce Brute-Force Rate Limiting & Account Lockout Protection
  checkBruteForceLock(emailKey);

  const sha256Hash = await hashPasswordSecure(cleanEmail, password);
  const legacyHash = simpleHash(password);
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
          name: sanitizeInput(data.name || fbUser.displayName || cleanEmail.split('@')[0], 80),
          email: cleanEmail,
          householdName: sanitizeInput(data.householdName || 'Bahay HQ', 80),
          role: sanitizeInput(data.role || 'Head of House', 50),
          createdAt: data.createdAt || new Date().toISOString(),
        };
      }
    } catch {
      // ignore Firestore fetch error
    }

    const resolvedUser: AuthUser = profile || {
      uid: fbUser.uid,
      name: sanitizeInput(fbUser.displayName || cleanEmail.split('@')[0], 80),
      email: cleanEmail,
      householdName: 'Bahay HQ',
      role: 'Head of House',
      createdAt: new Date().toISOString(),
    };

    localAccounts[emailKey] = { ...resolvedUser, passwordHash: sha256Hash };
    saveLocalAccounts(localAccounts);
    clearLoginAttempts(emailKey);
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
      const matchesSha = remoteAcc.passwordHash === sha256Hash;
      const matchesLegacy = remoteAcc.passwordHash === legacyHash;

      if (matchesSha || matchesLegacy) {
        const user: AuthUser = {
          uid: remoteAcc.uid,
          name: sanitizeInput(remoteAcc.name, 80),
          email: remoteAcc.email,
          householdName: sanitizeInput(remoteAcc.householdName || 'Bahay HQ', 80),
          role: sanitizeInput(remoteAcc.role || 'Head of House', 50),
          createdAt: remoteAcc.createdAt,
        };
        const upgradedRecord: StoredLocalAccount = {
          ...user,
          passwordHash: sha256Hash,
        };
        localAccounts[emailKey] = upgradedRecord;
        saveLocalAccounts(localAccounts);
        clearLoginAttempts(emailKey);
        saveSessionUser(user);

        // Auto-upgrade legacy hash in Firestore to salted SHA-256
        if (matchesLegacy && !matchesSha) {
          setDoc(doc(firestoreDb, USERS_COLLECTION, emailKey), upgradedRecord, { merge: true }).catch(
            () => {}
          );
        }
        return user;
      } else {
        recordFailedLoginAttempt(emailKey);
        throw new Error('Incorrect password. Please double-check and try again.');
      }
    }
  } catch (e: any) {
    if (
      e?.message?.includes('Incorrect password') ||
      e?.message?.includes('Too many failed login attempts')
    ) {
      throw e;
    }
  }

  // 3. Check localStorage registry
  const localAcc = localAccounts[emailKey];
  if (localAcc) {
    const matchesSha = localAcc.passwordHash === sha256Hash;
    const matchesLegacy = localAcc.passwordHash === legacyHash;
    if (!matchesSha && !matchesLegacy) {
      recordFailedLoginAttempt(emailKey);
      throw new Error('Incorrect password. Please double-check and try again.');
    }
    const user: AuthUser = {
      uid: localAcc.uid,
      name: sanitizeInput(localAcc.name, 80),
      email: localAcc.email,
      householdName: sanitizeInput(localAcc.householdName, 80),
      role: sanitizeInput(localAcc.role, 50),
      createdAt: localAcc.createdAt,
    };
    if (matchesLegacy && !matchesSha) {
      localAccounts[emailKey] = { ...user, passwordHash: sha256Hash };
      saveLocalAccounts(localAccounts);
    }
    clearLoginAttempts(emailKey);
    saveSessionUser(user);
    return user;
  }

  recordFailedLoginAttempt(emailKey);
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
