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

export function startHostLogic(roomId: string, userId: string) {
    if (hostInterval) clearInterval(hostInterval);

    // Timer Loop
    hostInterval = setInterval(async () => {
        const doc = await get(ref(rtdb, `rooms/${roomId}`));
        if (!doc.exists()) return;

        let data = doc.val();
        let { auctionState, teams, players } = data;

        if (auctionState.status === 'starting') {
            if (auctionState.timer > 0) {
                await update(ref(rtdb, `rooms/${roomId}/auctionState`), { timer: auctionState.timer - 1 });
            } else {
                await startNewRound(roomId, data);
            }
        }
        else if (auctionState.status === 'bidding') {
            const player = players[auctionState.currentPlayerIndex];

            if (auctionState.timer <= 0) {
                if (!isProcessingResolve) {
                    isProcessingResolve = true;
                    await resolveRound(roomId, data);
                    isProcessingResolve = false;
                }
            } else {
                // Bots thinking
                if (auctionState.timer % 2 === 0) {
                    const potentialBots = teams.filter((t: any) => t.isBot && t.id !== auctionState.highestBidderId).sort(() => Math.random() - 0.5).slice(0, 1);
                    for (const team of potentialBots) {
                        const shouldBid = await getBotDecision(team, player, auctionState.currentBid, auctionState.highestBidderId, players);
                        if (shouldBid) {
                            await placeBid(roomId, team.id);
                            break;
                        }
                    }
                }

                // Tick
                await runTransaction(ref(rtdb, `rooms/${roomId}/auctionState`), (state) => {
                    if (state && state.status === 'bidding' && state.timer > 0) {
                        state.timer--;
                    }
                    return state;
                });
            }
        }
    }, 1000);
}

export function stopHostLogic() {
    if (hostInterval) clearInterval(hostInterval);
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
    const bots = teams.filter((t: any) => t.isBot && t.squad && t.squad.length < 21 && t.budget > 1.0 && (!player.isForeign || t.foreignCount < 8));

    if (bots.length > 0) {
        const finalBid = Math.max(auctionState.currentBid, Math.floor((2.0 + Math.random() * 5.0) * 4) / 4);
        const randomBot = bots[Math.floor(Math.random() * bots.length)];

        await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
            currentBid: finalBid,
            highestBidderId: randomBot.id,
            timer: 0 // forces end
        });
    } else {
        await update(ref(rtdb, `rooms/${roomId}/auctionState`), { timer: 0 }); // unsold
    }
}
