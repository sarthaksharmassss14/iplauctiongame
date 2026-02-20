require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, deleteDoc, getDocs, collection } = require("firebase/firestore");
const fs = require('fs');

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

async function syncPlayers() {
  const players = JSON.parse(fs.readFileSync('./src/data/players.json', 'utf8'));
  
  // Clean up existing players optionally, or just overwrite the changed ones.
  // We'll update players 1 to 50 explicitly to fix the roles.
  const toUpdate = players.slice(0, 50);
  console.log(`Updating ${toUpdate.length} players to fix their roles...`);
  
  let count = 0;
  for (const p of toUpdate) {
    await setDoc(doc(db, "players", p.id.toString()), p, { merge: true });
    count++;
    if (count % 10 === 0) console.log(`Updated ${count} players...`);
  }
  
  // Remove "Overseas player" id = 26 from Firebase since we removed it from local JSON
  try {
    console.log("Deleting id 26 from Firebase...");
    await deleteDoc(doc(db, "players", "26"));
    console.log("Deleted id 26!");
  } catch (e) {
    console.log("Delete error", e.message);
  }
  
  console.log('Firebase Sync Complete! Please restart your local server again.');
  process.exit();
}

syncPlayers();
