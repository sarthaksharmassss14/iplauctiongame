const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, collection, getDocs } = require("firebase/firestore");

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

// Helper function for timeout
const withTimeout = (promise, ms = 3000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Timeout")), ms))
    ]);
};

async function saveGameState(auctionState, teams, roomId = "current_state") {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    try {
        await withTimeout(setDoc(doc(db, "auction", roomId), {
            auctionState,
            teams,
            updatedAt: new Date()
        }));
    } catch (e) {
        console.warn("Persistence: Save failed (offline or timeout)");
    }
}

async function loadGameState(roomId = "current_state") {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
    try {
        const docSnap = await withTimeout(getDoc(doc(db, "auction", roomId)));
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (e) {
        console.warn("Persistence: Load failed (offline or timeout)");
    }
    return null;
}

async function getPlayersFromDB() {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
    try {
        const querySnapshot = await withTimeout(getDocs(collection(db, "players")), 5000);
        const players = [];
        querySnapshot.forEach((doc) => {
            players.push(doc.data());
        });
        return players.sort((a, b) => a.id - b.id);
    } catch (e) {
        console.error("Persistence: Fetch players failed:", e.message);
    }
    return null;
}

async function updatePlayerInDB(player, roomId = "") {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    try {
        const path = roomId ? `rooms/${roomId}/players` : "players";
        await withTimeout(setDoc(doc(db, path, player.id.toString()), player, { merge: true }));
    } catch (e) {
        console.warn(`Persistence: Update player ${player.id} failed`);
    }
}

module.exports = { saveGameState, loadGameState, getPlayersFromDB, updatePlayerInDB };
