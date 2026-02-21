const fs = require('fs');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, deleteDoc, setDoc, getDocs, collection } = require("firebase/firestore");
require('dotenv').config({ path: '.env.local' });

const filepath = path.join(__dirname, 'src', 'data', 'players.json');

async function main() {
  try {
    console.log("Reading players...");
    let players = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // Fix basePrice 30 -> 25
    players.forEach(p => {
      let price = Number(p.basePrice);
      if (price === 30 || price === "30") {
        p.basePrice = 50; // Using 50 to be safe, could be 25 but standard IPL 30L is normally bumped to 50L or 20L
      }
      if (price === 30) { p.basePrice = 25; } // Let's use 25 for lower tier as user asked 25 or 50
    });

    // Real change request: "if you find any player with 30 then chnge it to 25 or 50"
    // I will change it to 50.
    players.forEach(p => {
       if (Number(p.basePrice) === 30) p.basePrice = 50; 
    });

    // Sort by basePrice high to low
    players.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));

    // Reassign IDs
    players.forEach((p, index) => {
      p.id = index + 1;
    });

    // Write back to JSON
    fs.writeFileSync(filepath, JSON.stringify(players, null, 2));
    console.log(`Successfully processed and sorted ${players.length} players locally.`);

    // Initialize Firebase
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.log("No Firebase config found. Skipping DB upload.");
      process.exit(0);
    }

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

    console.log("Fetching old players from Firestore to clear...");
    const snapshot = await getDocs(collection(db, "players"));
    let deletedCount = 0;
    
    // We do sequential deletes just to avoid batch NOT_FOUND errors
    for (const d of snapshot.docs) {
      try {
        await deleteDoc(doc(db, "players", d.id));
        deletedCount++;
      } catch (err) {
        console.warn(`Could not delete doc ${d.id}:`, err?.message);
      }
    }
    console.log(`Cleared ${deletedCount} old players.`);

    console.log("Uploading newly sorted players to Firestore...");
    let uploadedCount = 0;
    
    // Upload in small chunks or sequentially
    for (const p of players) {
      try {
        await setDoc(doc(db, "players", p.id.toString()), p, { merge: false });
        uploadedCount++;
        if (uploadedCount % 50 === 0) console.log(`Uploaded ${uploadedCount}/${players.length}...`);
      } catch (err) {
        console.error(`Failed to upload player ${p.id}:`, err?.message);
      }
    }

    console.log(`\nSuccessfully pushed ${uploadedCount} players to DB in the new sorted order!`);
    process.exit(0);
  } catch (err) {
    console.error("An error occurred:", err);
    process.exit(1);
  }
}

main();
