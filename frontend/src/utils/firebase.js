import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth Functions
export const signUpUser = async (email, password, role) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await saveUserProfile(user.uid, { email, role });
    return user;
};

export const signInUser = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const signOutUser = () => signOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const getCurrentUser = () => auth.currentUser;

export const onAuthStateChange = (callback) => onAuthStateChanged(auth, callback);

// Firestore Functions
export const saveUserProfile = async (uid, data) => {
    await setDoc(doc(db, "users", uid), {
        ...data,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

export const getUserRole = async (uid) => {
    if (!uid) return null;
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data().role : null;
};

// Error Message Mapping
export const getAuthErrorMessage = (err) => {
    const code = err?.code || err?.message || "";

    switch (code) {
        case 'auth/user-not-found':
            return 'No user found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'Email is already registered.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/operation-not-allowed':
            return 'Email/Password accounts are not enabled in the Firebase Console.';
        case 'auth/configuration-not-found':
            return 'Firebase Configuration mismatch. Check your Project ID and API Key.';
        case 'permission-denied':
            return 'Database access denied. Please check your Firestore Security Rules.';
        default:
            if (code.includes('quota-exceeded')) return 'Firebase quota exceeded.';
            if (code.includes('network-request-failed')) return 'Network error. Please check your connection.';
            return `Error: ${code || 'An unexpected error occurred. Please try again.'}`;
    }
};
