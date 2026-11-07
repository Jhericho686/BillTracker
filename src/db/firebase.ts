import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { HouseholdDatabaseState } from '../types/database';

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

const HOUSEHOLD_COLLECTION = 'households';
const HOUSEHOLD_DOC_ID = 'main_bahay_clean';

export async function syncStateToFirebase(state: HouseholdDatabaseState): Promise<void> {
  try {
    const docRef = doc(firestoreDb, HOUSEHOLD_COLLECTION, HOUSEHOLD_DOC_ID);
    await setDoc(docRef, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Silent fallback when offline or before Firestore is enabled in console
  }
}

export async function fetchStateFromFirebase(): Promise<Partial<HouseholdDatabaseState> | null> {
  try {
    const docRef = doc(firestoreDb, HOUSEHOLD_COLLECTION, HOUSEHOLD_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as Partial<HouseholdDatabaseState>;
    }
    return null;
  } catch {
    return null;
  }
}

