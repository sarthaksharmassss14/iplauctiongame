'use client';

import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import playersData from '../../data/players.json';

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

export default function SyncPage() {
    const [status, setStatus] = useState('Idle');
    const [progress, setProgress] = useState('');

    const handleSync = async () => {
        setStatus('Syncing...');
        try {
            let batchCount = 0;
            let batch = writeBatch(db);
            let totalCount = 0;

            for (const player of playersData) {
                const playerRef = doc(db, 'players', player.id.toString());
                batch.set(playerRef, player, { merge: false });
                batchCount++;
                totalCount++;

                if (batchCount === 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                    setProgress(`Uploaded ${totalCount}/${playersData.length}`);
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            setStatus('Success!');
            setProgress(`Finished syncing all ${totalCount} players.`);
        } catch (err: any) {
            console.error(err);
            setStatus('Error: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '2rem', color: 'white' }}>
            <h1>DB Sync Utility</h1>
            <button
                onClick={handleSync}
                style={{ padding: '0.5rem 1rem', background: '#07c2f6', color: '#111', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            >
                Start Sync to Firestore
            </button>
            <p style={{ marginTop: '1rem' }}>Status: {status}</p>
            <p>{progress}</p>
        </div>
    );
}
