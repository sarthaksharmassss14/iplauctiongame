import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "your-database-url"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);

export { db, auth, rtdb };
