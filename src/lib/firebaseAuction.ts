import { rtdb } from "./firebase";
import { ref, get, set, update, onValue, runTransaction } from "firebase/database";
import playersData from '@/data/players.json';
import { getBotDecision } from "./botLogic";

export const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const teamDataConf = [
    { id: "team_0", name: "Chennai Super Kings", short: "CSK", color: "var(--csk-yellow)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/300px-Chennai_Super_Kings_Logo.svg.png" },
    { id: "team_1", name: "Mumbai Indians", short: "MI", color: "var(--mi-blue)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/300px-Mumbai_Indians_Logo.svg.png" },
    { id: "team_2", name: "Royal Challengers Bengaluru", short: "RCB", color: "var(--rcb-red)", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/%E0%A4%B0%E0%A5%89%E0%A4%AF%E0%A4%B2_%E0%A4%9A%E0%A5%88%E0%A4%B2%E0%A5%87%E0%A4%82%E0%A4%9C%E0%A4%B0%E0%A5%8D%E0%A4%B8_%E0%A4%AC%E0%A5%87%E0%A4%82%E0%A4%97%E0%A4%B2%E0%A5%81%E0%A4%B0%E0%A5%81_%E0%A4%B2%E0%A5%8B%E0%A4%97%E0%A5%8B.png" },
    { id: "team_3", name: "Kolkata Knight Riders", short: "KKR", color: "var(--kkr-purple)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/300px-Kolkata_Knight_Riders_Logo.svg.png" },
    { id: "team_4", name: "Delhi Capitals", short: "DC", color: "var(--dc-blue)", logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg" },
    { id: "team_5", name: "Punjab Kings", short: "PBKS", color: "var(--pbks-red)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/300px-Punjab_Kings_Logo.svg.png" },
    { id: "team_6", name: "Rajasthan Royals", short: "RR", color: "var(--rr-pink)", logo: "https://upload.wikimedia.org/wikipedia/en/5/5c/This_is_the_logo_for_Rajasthan_Royals%2C_a_cricket_team_playing_in_the_Indian_Premier_League_%28IPL%29.svg" },
    { id: "team_7", name: "Sunrisers Hyderabad", short: "SRH", color: "var(--srh-orange)", logo: "https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg" },
    { id: "team_8", name: "Lucknow Super Giants", short: "LSG", color: "var(--lsg-teal)", logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_IPL_Logo.svg" },
    { id: "team_9", name: "Gujarat Titans", short: "GT", color: "var(--gt-blue)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/300px-Gujarat_Titans_Logo.svg.png" }
];

export const createInitialTeams = () => teamDataConf.map((tc, i) => ({
    id: tc.id, name: tc.name, short: tc.short,
    owner: `Bot ${i}`, budget: 100, squad: [],
    foreignCount: 0, color: tc.color, logo: tc.logo,
    isBot: true, socketId: null
}));

export async function createRoom(userId: string, maxHumans: number) {
    const roomId = generateRoomId();
    await set(ref(rtdb, `rooms/${roomId}`), {
        id: roomId,
        auctionState: {
            currentPlayerIndex: 0,
            currentBid: 0,
            highestBidderId: null,
            timer: 10,
            status: 'lobby',
            joinedPlayers: 0,
            maxHumans: maxHumans || 1,
            hostId: userId,
            isAccelerated: false
        },
        teams: createInitialTeams(),
        players: playersData
    });
    return roomId;
}

export async function joinRoom(roomId: string, userId: string, teamId: string | null) {
    const doc = await get(ref(rtdb, `rooms/${roomId}`));
    if (!doc.exists()) throw new Error("Room not found");

    let state = doc.val();
    let teams = state.teams;

    let assignedTeam = teams.find((t: any) => t.owner === userId && !t.isBot);

    if (!assignedTeam && teamId) {
        const team = teams.find((t: any) => t.id === teamId);
        if (team && (team.isBot || team.socketId === null)) {
            assignedTeam = team;
        }
    }

    if (!assignedTeam) {
        assignedTeam = teams.find((t: any) => t.isBot);
    }

    if (assignedTeam) {
        assignedTeam.isBot = false;
        assignedTeam.owner = userId || "Human";
        assignedTeam.socketId = "active";
    }

    state.auctionState.joinedPlayers = teams.filter((t: any) => !t.isBot).length;

    await set(ref(rtdb, `rooms/${roomId}/teams`), teams);
    await set(ref(rtdb, `rooms/${roomId}/auctionState/joinedPlayers`), state.auctionState.joinedPlayers);

    return assignedTeam?.id;
}

export async function placeBid(roomId: string, teamId: string) {
    await runTransaction(ref(rtdb, `rooms/${roomId}/auctionState`), (state) => {
        if (!state || state.status !== 'bidding') return state;
        if (state.highestBidderId === teamId) return state; // No self bid

        const inc = state.highestBidderId === null ? state.currentBid : state.currentBid + 0.25;
        state.currentBid = inc;
        state.highestBidderId = teamId;
        state.timer = state.isAccelerated ? 3 : 7;
        return state;
    });
}

// Host ONLY Logic loop
let hostInterval: any = null;
let isProcessingResolve = false;

let hostUnsubscribe: any = null;

export function startHostLogic(roomId: string, userId: string) {
    if (hostInterval) clearInterval(hostInterval);
    if (hostUnsubscribe) hostUnsubscribe();

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    let isProcessing = false;

    // 1. INSTANT REACTION LISTENER (Push-based like Socket.io)
    hostUnsubscribe = onValue(roomRef, async (snapshot) => {
        if (isProcessing) return;
        const data = snapshot.val();
        if (!data || data.auctionState.status !== 'bidding') return;

        const { auctionState, teams, players } = data;
        const player = players[auctionState.currentPlayerIndex];

        // If human bid, bots should react IMMEDIATELY
        const lastBidder = teams.find((t: any) => t.id === auctionState.highestBidderId);

        if (lastBidder && !lastBidder.isBot) {
            isProcessing = true;
            const eligibleBots = teams.filter((t: any) => t.isBot && t.id !== auctionState.highestBidderId);
            if (eligibleBots.length > 0) {
                const bot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
                const shouldBid = await getBotDecision(bot, player, auctionState.currentBid, auctionState.highestBidderId, players);
                if (shouldBid) {
                    await placeBid(roomId, bot.id);
                }
            }
            isProcessing = false;
        }
    });

    // 2. TIMER TICKER (Dedicated for clock only)
    hostInterval = setInterval(async () => {
        const doc = await get(ref(rtdb, `rooms/${roomId}/auctionState`));
        if (!doc.exists()) return;
        const state = doc.val();

        if (state.status === 'starting' || state.status === 'bidding') {
            if (state.timer > 0) {
                await runTransaction(ref(rtdb, `rooms/${roomId}/auctionState/timer`), (t) => {
                    if (t > 0) return t - 1;
                    return t;
                });
            } else {
                const fullDoc = await get(ref(rtdb, `rooms/${roomId}`));
                if (fullDoc.exists()) {
                    const fullData = fullDoc.val();
                    if (fullData.auctionState.timer <= 0 && !isProcessingResolve) {
                        isProcessingResolve = true;
                        await resolveRound(roomId, fullData);
                        isProcessingResolve = false;
                    }
                }
            }
        }
    }, 1000);
}

export function stopHostLogic() {
    if (hostInterval) clearInterval(hostInterval);
    if (hostUnsubscribe) hostUnsubscribe();
}

export async function forceStartAuction(roomId: string) {
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
        status: 'starting',
        timer: 5
    });
}

export async function endAuction(roomId: string) {
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'finished' });
}

export async function forceStartAccelerated(roomId: string) {
    await runTransaction(ref(rtdb, `rooms/${roomId}`), (room) => {
        if (!room) return room;
        const unsoldPlayers = room.players.filter((p: any) => p.status === 'unsold' && !p.id.toString().includes('_accel'));
        room.auctionState.isAccelerated = true;

        const acceleratedPlayers = unsoldPlayers.map((p: any) => ({
            ...p,
            id: p.id + '_accel',
            status: 'pending'
        }));

        room.players = [...room.players, ...acceleratedPlayers];

        room.auctionState.status = 'bidding';
        const p = room.players[room.auctionState.currentPlayerIndex];
        if (p) {
            room.auctionState.currentBid = p.basePrice / 100;
            room.auctionState.highestBidderId = null;
            room.auctionState.timer = 3;
        } else {
            room.auctionState.status = 'finished';
        }
        return room;
    });
}

async function startNewRound(roomId: string, data: any) {
    let { auctionState, players } = data;

    if (auctionState.currentPlayerIndex >= players.length) {
        if (!auctionState.isAccelerated) {
            const unsoldPlayers = players.filter((p: any) => p.status === 'unsold' && !p.id.toString().includes('_accel'));
            if (unsoldPlayers.length > 0) {
                if (auctionState.maxHumans === 1) {
                    auctionState.status = 'waiting_accelerated';
                    auctionState.timer = 0;
                    await update(ref(rtdb, `rooms/${roomId}/auctionState`), auctionState);
                    return;
                } else {
                    // Auto accel
                    forceStartAccelerated(roomId);
                    return;
                }
            } else {
                await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'finished' });
                return;
            }
        } else {
            await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'finished' });
            return;
        }
    }

    // Next player bidding
    const player = players[auctionState.currentPlayerIndex];
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
        status: 'bidding',
        currentBid: player.basePrice / 100,
        highestBidderId: null,
        timer: auctionState.isAccelerated ? 3 : 7
    });
}

async function resolveRound(roomId: string, data: any) {
    let { auctionState, teams, players } = data;
    const player = players[auctionState.currentPlayerIndex];

    if (auctionState.highestBidderId) {
        auctionState.status = 'sold';
        const winner = teams.find((t: any) => t.id === auctionState.highestBidderId);
        if (winner) {
            if (!winner.squad) winner.squad = [];
            winner.budget -= auctionState.currentBid;
            winner.squad.push(player.id);
            if (player.isForeign) winner.foreignCount++;
            player.status = 'sold';
            player.soldPrice = auctionState.currentBid;
            player.teamId = winner.id;
        }
    } else {
        auctionState.status = 'unsold';
        player.status = 'unsold';
    }

    auctionState.currentPlayerIndex++;

    await update(ref(rtdb, `rooms/${roomId}`), {
        auctionState, teams, players
    });

    setTimeout(async () => {
        const freshDoc = await get(ref(rtdb, `rooms/${roomId}`));
        if (freshDoc.exists()) await startNewRound(roomId, freshDoc.val());
    }, 2000);
}

export async function skipPlayerAction(roomId: string, teamId: string) {
    const doc = await get(ref(rtdb, `rooms/${roomId}`));
    if (!doc.exists()) return;
    const room = doc.val();
    const { auctionState, teams, players } = room;

    const humanTeams = teams.filter((t: any) => !t.isBot);
    if (humanTeams.length > 1) return;
    if (humanTeams[0] && humanTeams[0].id !== teamId) return;

    if (auctionState.highestBidderId !== null) {
        // Just end timer
        await update(ref(rtdb, `rooms/${roomId}/auctionState`), { timer: 0 });
        return;
    }

    const player = players[auctionState.currentPlayerIndex];
    if (!player) return;

    // Determine rating with fallback
    let r = player.rating;
    if (r === undefined || r === null) {
        const bp = Number(player.basePrice) || 0;
        if (bp >= 200) r = 4;
        else if (bp >= 100) r = 3;
        else r = 2;
    }
    const rating = r || 2;
    const baseInCr = (player.basePrice || 20) / 100;

    // Calculate potential price based on rating
    let targetPrice = baseInCr;
    if (rating >= 4) {
        targetPrice = 8.0 + (Math.random() * 12.0); // 8-20 CR
    } else if (rating === 3) {
        targetPrice = baseInCr + (Math.random() * (8.0 - baseInCr)); // Base to 8 CR
    } else {
        targetPrice = Math.random() < 0.5 ? baseInCr : baseInCr + 0.25; // Base or Base + 0.25
    }

    // Round to 0.25 increments
    targetPrice = Math.floor(targetPrice * 4) / 4;

    // Filter bots who can actually afford this price
    const eligibleBots = teams.filter((t: any) =>
        t.isBot &&
        t.budget >= targetPrice &&
        (t.squad || []).length < 21 &&
        (!player.isForeign || (t.foreignCount || 0) < 8)
    );

    if (eligibleBots.length > 0) {
        const randomBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
        await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
            currentBid: targetPrice,
            highestBidderId: randomBot.id,
            timer: 0 // forces end
        });
    } else {
        // If no bot can afford the premium price, try base price with any bot
        const fallbackBots = teams.filter((t: any) =>
            t.isBot &&
            t.budget >= baseInCr &&
            (t.squad || []).length < 21
        );
        if (fallbackBots.length > 0) {
            const randomBot = fallbackBots[Math.floor(Math.random() * fallbackBots.length)];
            await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
                currentBid: baseInCr,
                highestBidderId: randomBot.id,
                timer: 0
            });
        } else {
            await update(ref(rtdb, `rooms/${roomId}/auctionState`), { timer: 0 }); // unsold
        }
    }
}
