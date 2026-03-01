import { rtdb } from "./firebase";
import { ref, get, set, update, onValue, runTransaction, Unsubscribe } from "firebase/database";
import playersData from '@/data/players.json';
import { getBotDecision } from "./botLogic";
import { Player, Team, AuctionState } from "@/types";

export const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const teamDataConf = [
    { id: "team_0", name: "Chennai Super Kings", short: "CSK", color: "var(--csk-yellow)", secondary: "#0081E9", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/300px-Chennai_Super_Kings_Logo.svg.png" },
    { id: "team_1", name: "Mumbai Indians", short: "MI", color: "var(--mi-blue)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/300px-Mumbai_Indians_Logo.svg.png" },
    { id: "team_2", name: "Royal Challengers Bengaluru", short: "RCB", color: "var(--rcb-red)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/%E0%A4%B0%E0%A5%89%E0%A4%AF%E0%A4%B2_%E0%A4%9A%E0%A5%88%E0%A4%B2%E0%A5%87%E0%A4%82%E0%A4%9C%E0%A4%B0%E0%A5%8D%E0%A4%B8_%E0%A4%AC%E0%A5%87%E0%A4%82%E0%A4%97%E0%A4%B2%E0%A5%81%E0%A4%B0%E0%A5%81_%E0%A4%B2%E0%A5%8B%E0%A4%97%E0%A5%8B.png" },
    { id: "team_3", name: "Kolkata Knight Riders", short: "KKR", color: "var(--kkr-purple)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/300px-Kolkata_Knight_Riders_Logo.svg.png" },
    { id: "team_4", name: "Delhi Capitals", short: "DC", color: "var(--dc-blue)", secondary: "#EF1B24", logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg" },
    { id: "team_5", name: "Punjab Kings", short: "PBKS", color: "var(--pbks-red)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/300px-Punjab_Kings_Logo.svg.png" },
    { id: "team_6", name: "Rajasthan Royals", short: "RR", color: "var(--rr-pink)", secondary: "#254AA5", logo: "https://upload.wikimedia.org/wikipedia/en/5/5c/This_is_the_logo_for_Rajasthan_Royals%2C_a_cricket_team_playing_in_the_Indian_Premier_League_%28IPL%29.svg" },
    { id: "team_7", name: "Sunrisers Hyderabad", short: "SRH", color: "var(--srh-orange)", secondary: "#000000", logo: "https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg" },
    { id: "team_8", name: "Lucknow Super Giants", short: "LSG", color: "var(--lsg-teal)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_IPL_Logo.svg" },
    { id: "team_9", name: "Gujarat Titans", short: "GT", color: "var(--gt-blue)", secondary: "#D1AB3E", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/300px-Gujarat_Titans_Logo.svg.png" }
];



export const createInitialTeams = (): Team[] => teamDataConf.map((tc, i) => ({
    id: tc.id, name: tc.name, short: tc.short,
    owner: `Bot ${i}`, budget: 100, squad: [],
    foreignCount: 0, color: tc.color, logo: tc.logo,
    isBot: true, socketId: null, secondaryColor: tc.secondary
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

    const state = doc.val();
    const teams: Team[] = state.teams;

    let assignedTeam = teams.find((t: Team) => t.owner === userId && !t.isBot);

    if (!assignedTeam && teamId) {
        const team = teams.find((t: Team) => t.id === teamId);
        if (team && (team.isBot || team.socketId === null)) {
            assignedTeam = team;
        }
    }

    if (!assignedTeam) {
        assignedTeam = teams.find((t: Team) => t.isBot);
    }

    if (assignedTeam) {
        assignedTeam.isBot = false;
        assignedTeam.owner = userId || "Human";
        assignedTeam.socketId = "active";
    }

    state.auctionState.joinedPlayers = teams.filter((t: Team) => !t.isBot).length;

    await set(ref(rtdb, `rooms/${roomId}/teams`), teams);
    await set(ref(rtdb, `rooms/${roomId}/auctionState/joinedPlayers`), state.auctionState.joinedPlayers);

    return assignedTeam?.id;
}

export async function placeBid(roomId: string, teamId: string) {
    console.log(`[BID] placeBid called for room: ${roomId}, team: ${teamId}`);
    const roomDoc = await get(ref(rtdb, `rooms/${roomId}`));
    if (!roomDoc.exists()) return;
    const room = roomDoc.val();
    const players = room.players || [];

    await runTransaction(ref(rtdb, `rooms/${roomId}/auctionState`), (state: AuctionState) => {
        if (!state || state.status !== 'bidding') return state;
        if (state.skipInProgress) return state; // PREVENT BIDS DURING SKIP
        if (state.highestBidderId === teamId) return state;

        const player = players[state.currentPlayerIndex];
        const basePrice = (Number(player?.basePrice) || 20) / 100;

        // CRITICAL: Force exactly base price for the first bidder
        if (state.highestBidderId === null) {
            state.currentBid = basePrice;
            console.log(`[BID] Enforcing Base Price: ${basePrice} for ${player?.name}`);
        } else {
            state.currentBid = Number((state.currentBid + 0.25).toFixed(2));
        }

        state.highestBidderId = teamId;
        state.timer = state.isAccelerated ? 4 : 7;
        return state;
    });
}

let hostInterval: NodeJS.Timeout | null = null;
let isProcessingResolve = false;
let hostUnsubscribe: Unsubscribe | null = null;

export function startHostLogic(roomId: string) {
    if (hostInterval) clearInterval(hostInterval);
    if (hostUnsubscribe) hostUnsubscribe();

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    let isProcessing = false;

    hostUnsubscribe = onValue(roomRef, async (snapshot) => {
        if (isProcessing) return;
        const data = snapshot.val();
        if (!data || data.auctionState.status !== 'bidding') return;

        const auctionState: AuctionState = data.auctionState;
        const teams: Team[] = data.teams;
        const eligibleBots = teams.filter((t: Team) => t.isBot && t.id !== auctionState.highestBidderId);
        if (eligibleBots.length === 0) return;

        // DELAYED OPENING: Bots wait 4 seconds before taking the base price
        const reactionDelay = auctionState.highestBidderId === null ? 4000 + Math.random() * 1000 : 400 + Math.random() * 800;

        isProcessing = true;
        setTimeout(async () => {
            try {
                const freshDoc = await get(ref(rtdb, `rooms/${roomId}`));
                if (!freshDoc.exists()) return;
                const freshData = freshDoc.val();
                if (freshData.auctionState.status !== 'bidding') return;

                const botToBid = (freshData.teams as Team[] || []).filter((t: Team) => t.isBot && t.id !== freshData.auctionState.highestBidderId);
                if (botToBid.length > 0) {
                    const bot = botToBid[Math.floor(Math.random() * botToBid.length)];
                    const player: Player = freshData.players[freshData.auctionState.currentPlayerIndex];
                    if (await getBotDecision(bot, player, freshData.auctionState.currentBid, freshData.auctionState.highestBidderId, freshData.players)) {
                        await placeBid(roomId, bot.id);
                    }
                }
            } finally {
                isProcessing = false;
            }
        }, reactionDelay);
    });

    hostInterval = setInterval(async () => {
        const doc = await get(ref(rtdb, `rooms/${roomId}/auctionState`));
        if (!doc.exists()) return;
        const state: AuctionState = doc.val();
        if (state.status === 'starting' || state.status === 'bidding') {
            if (state.timer > 0) {
                await runTransaction(ref(rtdb, `rooms/${roomId}/auctionState/timer`), (t) => (t > 0 ? t - 1 : t));
            } else if (!isProcessingResolve) {
                const fullDoc = await get(ref(rtdb, `rooms/${roomId}`));
                if (fullDoc.exists()) {
                    isProcessingResolve = true;
                    await resolveRound(roomId, fullDoc.val());
                    isProcessingResolve = false;
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
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'starting', timer: 5 });
}

export async function endAuction(roomId: string) {
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'finished' });
}

export async function forceStartAccelerated(roomId: string) {
    await runTransaction(ref(rtdb, `rooms/${roomId}`), (room) => {
        if (!room) return room;
        const unsold = (room.players as Player[]).filter((p: Player) => p.status === 'unsold' && !p.id.toString().includes('_accel'));
        const startIndex = room.players.length;
        const batch = unsold.map((p: Player) => ({ ...p, id: p.id + '_accel', status: 'pending' as const }));
        room.players = [...room.players, ...batch];
        room.auctionState.isAccelerated = true;
        room.auctionState.currentPlayerIndex = startIndex;
        room.auctionState.status = 'bidding';
        if (batch[0]) {
            room.auctionState.currentBid = batch[0].basePrice / 100;
            room.auctionState.highestBidderId = null;
            room.auctionState.timer = 4;
        } else room.auctionState.status = 'finished';
        return room;
    });
}

export async function autoAssignRemainingSlots(roomId: string) {
    await runTransaction(ref(rtdb, `rooms/${roomId}`), (room) => {
        if (!room) return room;
        const unsold = (room.players as Player[]).filter((p: Player) => p.status === 'unsold');
        unsold.sort((a: Player, b: Player) => (b.rating || 2) - (a.rating || 2));
        (room.teams as Team[]).forEach((team: Team) => {
            while ((team.squad || []).length < 15 && unsold.length > 0) {
                const pIdx = unsold.findIndex((p: Player) => team.budget >= (p.basePrice / 100) && (!p.isForeign || (team.foreignCount || 0) < 8));
                if (pIdx === -1) break;
                const p = unsold.splice(pIdx, 1)[0];
                team.budget -= (p.basePrice / 100);
                if (!team.squad) team.squad = [];
                team.squad.push(p.id);
                if (p.isForeign) team.foreignCount = (team.foreignCount || 0) + 1;
                const op = (room.players as Player[]).find((x: Player) => x.id === p.id);
                if (op) { op.status = 'sold'; op.soldPrice = (p.basePrice / 100); op.teamId = team.id; }
            }
        });
        room.auctionState.status = 'finished';
        return room;
    });
}

async function startNewRound(roomId: string, data: { auctionState: AuctionState, players: Player[] }) {
    const auctionState = data.auctionState;
    const players = data.players;
    if (auctionState.currentPlayerIndex >= players.length) {
        if (!auctionState.isAccelerated && players.filter((p: Player) => p.status === 'unsold').length > 0 && auctionState.maxHumans === 1) {
            await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'waiting_accelerated', timer: 0 });
        } else await update(ref(rtdb, `rooms/${roomId}/auctionState`), { status: 'finished' });
        return;
    }
    const player = players[auctionState.currentPlayerIndex];
    await update(ref(rtdb, `rooms/${roomId}/auctionState`), {
        status: 'bidding',
        currentBid: player.basePrice / 100,
        highestBidderId: null,
        timer: auctionState.isAccelerated ? 4 : 7,
        skipInProgress: false // ALWAYS RESET ON NEW ROUND
    });
}

async function moveToNextPlayerAfterDelay(roomId: string) {
    setTimeout(async () => {
        const f = await get(ref(rtdb, `rooms/${roomId}`));
        if (f.exists()) {
            const freshData = f.val();
            const nextIndex = freshData.auctionState.currentPlayerIndex + 1;
            // Sync the index back to DB first
            await update(ref(rtdb, `rooms/${roomId}/auctionState`), { currentPlayerIndex: nextIndex });
            // Now start the fresh round
            freshData.auctionState.currentPlayerIndex = nextIndex;
            await startNewRound(roomId, freshData);
        }
    }, 2000);
}

async function resolveRound(roomId: string, data: { auctionState: AuctionState, teams: Team[], players: Player[] }) {
    const auctionState = data.auctionState;
    const teams = data.teams;
    const players = data.players;
    if (auctionState.status === 'starting') { await startNewRound(roomId, data); return; }

    const player = players[auctionState.currentPlayerIndex];
    if (auctionState.highestBidderId) {
        const winner = teams.find((t: Team) => t.id === auctionState.highestBidderId);
        if (winner) {
            winner.budget -= auctionState.currentBid;
            if (!winner.squad) winner.squad = [];
            winner.squad.push(player.id);
            if (player.isForeign) winner.foreignCount = (winner.foreignCount || 0) + 1;
            player.status = 'sold';
            player.soldPrice = auctionState.currentBid;
            player.teamId = winner.id;
            auctionState.status = 'sold';
        }
    } else {
        player.status = 'unsold';
        auctionState.status = 'unsold';
    }

    // Update status but STAY on current player for 2 seconds
    await update(ref(rtdb, `rooms/${roomId}`), { auctionState, teams, players });
    await moveToNextPlayerAfterDelay(roomId);
}

export async function skipPlayerAction(roomId: string) {
    console.log(`[SKIP] Atomic Skip Triggered: ${roomId}`);

    let shouldTriggerNext = false;

    await runTransaction(ref(rtdb, `rooms/${roomId}`), (room) => {
        if (!room) return room;
        const auctionState: AuctionState = room.auctionState;
        const players: Player[] = room.players;
        const teams: Team[] = room.teams;

        if (auctionState.status !== 'bidding' || auctionState.skipInProgress) return room;

        auctionState.skipInProgress = true;
        const player = players[auctionState.currentPlayerIndex];
        if (!player) { auctionState.skipInProgress = false; return room; }

        const r = player.rating || 2;
        const baseInCr = (Number(player.basePrice) || 20) / 100;

        // Custom Mapping for Star Players
        const homeTeamMapping: Record<string, string> = {
            "Sanju Samson": "team_4", "Jos Buttler": "team_4", "Yashasvi Jaiswal": "team_4", // RR
            "MS Dhoni": "team_0", "Ravindra Jadeja": "team_0", "Ruturaj Gaikwad": "team_0", // CSK
            "Virat Kohli": "team_6", // RCB
            "Rohit Sharma": "team_1", "Suryakumar Yadav": "team_1", "Jasprit Bumrah": "team_1", "Hardik Pandya": "team_1", // MI
            "Rashid Khan": "team_3", "Shubman Gill": "team_3", // GT
            "Rishabh Pant": "team_5", // LSG
            "Shreyas Iyer": "team_2", "Sunil Narine": "team_2", "Andre Russell": "team_2", // KKR
            "Abhishek Sharma": "team_9", "Pat Cummins": "team_9", "Travis Head": "team_9", // SRH
            "Arshdeep Singh": "team_7", // PBKS
            "KL Rahul": "team_8", "Axar Patel": "team_8" // DC
        };

        const preferredTeamId = homeTeamMapping[player.name];

        // 1. Calculate the Premium Price based on Star Rating
        // 5 star = +3-5 CR, 4 star = +2-3 CR, 3 star = +1 CR, 2 star = +0 CR
        let ratingInc = 0;
        if (r >= 5) ratingInc = 3.0 + (Math.random() * 2.0);
        else if (r >= 4) ratingInc = 2.0 + (Math.random() * 1.0);
        else if (r >= 3) ratingInc = 1.0;

        const currentP = auctionState.highestBidderId ? auctionState.currentBid : baseInCr;
        let targetPremiumPrice = Math.floor((currentP + ratingInc) * 4) / 4;
        targetPremiumPrice = Math.min(targetPremiumPrice, 18.0); // Hard cap

        // 2. Identify the Target Bot
        let selectedBot: Team | undefined;
        let actualP = targetPremiumPrice;

        if (auctionState.highestBidderId && auctionState.highestBidderId !== auctionState.hostId) {
            // If a bot is already winning, they remain the winner but at the premium price
            selectedBot = teams.find(t => t.id === auctionState.highestBidderId);
        }

        if (!selectedBot) {
            const preferredTeamId = homeTeamMapping[player.name];
            const isStar = !!preferredTeamId;
            const hasBid = !!auctionState.highestBidderId;

            // Rule: If no bid and not a star -> go Unsold
            if (!hasBid && !isStar) {
                selectedBot = undefined;
            } else {
                const pTeam = preferredTeamId ? teams.find(t => t.id === preferredTeamId && t.isBot) : null;
                const bestGenericBot = [...teams]
                    .filter(t => t.isBot && t.id !== auctionState.hostId && (t.squad || []).length < 25)
                    .sort((a, b) => b.budget - a.budget)[0];

                selectedBot = pTeam || bestGenericBot;
            }
        }

        // 3. Final Eligibility & Safety Check
        if (selectedBot) {
            // Ensure bot can afford it, or fallback to their max budget if they are the only choice
            if (selectedBot.budget < actualP) {
                actualP = Math.max(currentP, selectedBot.budget);
            }
            if (actualP < 0.20) actualP = 0.20;
        }

        if (selectedBot && actualP >= 0) {
            selectedBot.budget = Number((selectedBot.budget - actualP).toFixed(2));
            if (!selectedBot.squad) selectedBot.squad = [];
            selectedBot.squad.push(player.id);
            if (player.isForeign) selectedBot.foreignCount = (selectedBot.foreignCount || 0) + 1;

            player.status = 'sold';
            player.soldPrice = actualP;
            player.teamId = selectedBot.id;

            auctionState.highestBidderId = selectedBot.id;
            auctionState.currentBid = actualP;
            auctionState.status = 'sold';
            auctionState.timer = 0;
        } else {
            player.status = 'unsold';
            auctionState.status = 'unsold';
            auctionState.timer = 0;
        }

        shouldTriggerNext = true;
        return room;
    });

    if (shouldTriggerNext) {
        await moveToNextPlayerAfterDelay(roomId);
    }
}
