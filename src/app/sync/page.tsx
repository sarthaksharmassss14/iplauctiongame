'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import playersData from '../../data/players.json';

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
