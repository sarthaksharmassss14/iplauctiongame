const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, collection, updateDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveGameState(auctionState, teams) {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    try {
        await setDoc(doc(db, "auction", "current_state"), {
            auctionState,
            teams,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("Error saving state:", e);
    }
}

async function loadGameState() {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
    try {
        const docSnap = await getDoc(doc(db, "auction", "current_state"));
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (e) {
        console.error("Error loading state:", e);
    }
    return null;
}

module.exports = { saveGameState, loadGameState };
