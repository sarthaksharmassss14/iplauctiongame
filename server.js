require('dotenv').config({ path: '.env.local' });
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const { getBotDecision } = require("./src/lib/botLogic");
const { saveGameState, loadGameState, getPlayersFromDB, updatePlayerInDB } = require("./src/lib/persistence");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

let playersData = [];
const playersPath = path.join(__dirname, 'src', 'data', 'players.json');
try {
    playersData = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
} catch (e) {
    console.error("Local players.json not found, relying on DB.");
}

const teamData = [
    { id: "team_0", name: "Chennai Super Kings", short: "CSK", color: "#f6f611", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/300px-Chennai_Super_Kings_Logo.svg.png" },
    { id: "team_1", name: "Mumbai Indians", short: "MI", color: "#083f88", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/300px-Mumbai_Indians_Logo.svg.png" },
    { id: "team_2", name: "Royal Challengers Bengaluru", short: "RCB", color: "#821922", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/%E0%A4%B0%E0%A5%89%E0%A4%AF%E0%A4%B2_%E0%A4%9A%E0%A5%88%E0%A4%B2%E0%A5%87%E0%A4%82%E0%A4%9C%E0%A4%B0%E0%A5%8D%E0%A4%B8_%E0%A4%AC%E0%A5%87%E0%A4%82%E0%A4%97%E0%A4%B2%E0%A5%81%E0%A4%B0%E0%A5%81_%E0%A4%B2%E0%A5%8B%E0%A4%97%E0%A5%8B.png" },
    { id: "team_3", name: "Kolkata Knight Riders", short: "KKR", color: "#3a0e7b", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/300px-Kolkata_Knight_Riders_Logo.svg.png" },
    { id: "team_4", name: "Delhi Capitals", short: "DC", color: "#07c2f6", logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg" },
    { id: "team_5", name: "Punjab Kings", short: "PBKS", color: "#ed1b24", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/300px-Punjab_Kings_Logo.svg.png" },
    { id: "team_6", name: "Rajasthan Royals", short: "RR", color: "#e50693", logo: "https://upload.wikimedia.org/wikipedia/en/5/5c/This_is_the_logo_for_Rajasthan_Royals%2C_a_cricket_team_playing_in_the_Indian_Premier_League_%28IPL%29.svg" },
    { id: "team_7", name: "Sunrisers Hyderabad", short: "SRH", color: "#f96b05", logo: "https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg" },
    { id: "team_8", name: "Lucknow Super Giants", short: "LSG", color: "#51c8a8", logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_IPL_Logo.svg" },
    { id: "team_9", name: "Gujarat Titans", short: "GT", color: "#1b274a", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/300px-Gujarat_Titans_Logo.svg.png" }
];

const rooms = {};

const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const createInitialTeams = () => teamData.map((tc, i) => ({
    id: tc.id,
    name: tc.name,
    short: tc.short,
    owner: `Bot ${i}`,
    budget: 100, 
    squad: [],
    foreignCount: 0,
    color: tc.color,
    logo: tc.logo,
    isBot: true,
    socketId: null
}));

app.prepare().then(() => {
    // Disabled loading players from DB because Firestore has stale/corrupt data
    /*
    getPlayersFromDB().then(dbPlayers => {
        if (dbPlayers && dbPlayers.length > 0) {
            playersData = dbPlayers;
            console.log(`[FIREBASE] Loaded ${playersData.length} players.`);
        }
    }).catch(err => console.error("[FIREBASE ERROR]", err.message));
    */
    console.log(`[LOCAL] Using ${playersData.length} players from local players.json`);

    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log(`[SOCKET] New connection: ${socket.id}`);

        socket.on("create-room", async ({ userId, maxHumans }) => {
            try {
                const roomId = generateRoomId();
                rooms[roomId] = {
                    id: roomId,
                    auctionState: {
                        currentPlayerIndex: 0,
                        currentBid: 0,
                        highestBidderId: null,
                        timer: 10,
                        status: 'lobby',
                        joinedPlayers: 0,
                        maxHumans: parseInt(maxHumans) || 1,
                        hostId: socket.id
                    },
                    teams: createInitialTeams(),
                    players: JSON.parse(JSON.stringify(playersData)) // Deep copy
                };

                await socket.join(roomId);
                console.log(`[ROOM] Created: ${roomId} by ${userId}`);
                socket.emit("room-created", roomId);
            } catch (err) {
                console.error("[CREATE ERROR]", err);
                socket.emit("error-msg", "Failed to create room.");
            }
        });

        socket.on("join-room", async ({ roomId, userId, teamId }) => {
            try {
                const room = rooms[roomId];
                if (!room) {
                    socket.emit("error-msg", "Room not found");
                    return;
                }

                await socket.join(roomId);
                
                // Reconnection/Resume support
                let assignedTeam = room.teams.find(t => t.owner === userId && !t.isBot);
                
                if (!assignedTeam && teamId) {
                    const team = room.teams.find(t => t.id === teamId);
                    if (team && (team.isBot || team.socketId === null)) {
                        assignedTeam = team;
                    }
                }
                
                if (!assignedTeam) {
                    assignedTeam = room.teams.find(t => t.isBot);
                }

                if (assignedTeam) {
                    assignedTeam.isBot = false;
                    assignedTeam.owner = userId || "Human";
                    assignedTeam.socketId = socket.id;
                    socket.emit("assigned-team", assignedTeam.id);
                    console.log(`[SOCKET] Assigned ${assignedTeam.name} to ${socket.id} in room ${roomId}`);
                }

                room.auctionState.joinedPlayers = room.teams.filter(t => !t.isBot).length;
                
                // Send current state to the joining user directly
                socket.emit("init-state", { 
                    auctionState: room.auctionState, 
                    teams: room.teams, 
                    players: room.players 
                });
                
                // Broadcast to everyone else
                socket.to(roomId).emit("player-joined", { userId, teams: room.teams });

                // Auto-start or check if all humans joined
                if (room.auctionState.status === 'lobby' && room.auctionState.joinedPlayers >= room.auctionState.maxHumans) {
                    startAuction(roomId);
                }
            } catch (err) {
                console.error("[JOIN ERROR]", err);
                socket.emit("error-msg", "Failed to join room.");
            }
        });

        socket.on("check-room", ({ roomId }) => {
            const room = rooms[roomId];
            if (room) {
                const takenTeamIds = room.teams.filter(t => !t.isBot || t.socketId !== null).map(t => t.id);
                socket.emit("room-info", { takenTeamIds });
            } else {
                socket.emit("error-msg", "Room not found");
            }
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET] Disconnected: ${socket.id}`);
            for (const roomId in rooms) {
                const room = rooms[roomId];
                const team = room.teams.find(t => t.socketId === socket.id);
                if (team) {
                    team.socketId = null;
                    io.to(roomId).emit("player-left", { teamId: team.id });
                    break;
                }
            }
        });

        socket.on("place-bid", ({ roomId, teamId, bidAmount }) => {
            const room = rooms[roomId];
            if (!room) return;
            const { auctionState } = room;

            if (teamId === auctionState.highestBidderId) return; 
            
            // Accept the bid if it's greater than current OR if it's the exact current bid but no one has bid yet (opening bid)
            if ((bidAmount > auctionState.currentBid || (bidAmount === auctionState.currentBid && auctionState.highestBidderId === null)) && auctionState.status === 'bidding') {
                auctionState.currentBid = bidAmount;
                auctionState.highestBidderId = teamId;
                auctionState.timer = auctionState.isAccelerated ? 5 : 7;
                console.log(`[BID] Manual bid in ${roomId}: ${teamId} -> ${bidAmount} Cr`);
                io.to(roomId).emit("bid-updated", { 
                    currentBid: auctionState.currentBid, 
                    highestBidderId: auctionState.highestBidderId,
                    timer: auctionState.timer
                });
            }
        });

        socket.on("skip-player", ({ roomId, teamId }) => {
            const room = rooms[roomId];
            if (!room || room.auctionState.status !== 'bidding') return;
            const { auctionState, teams, players } = room;

            // Only allow if single player (1 human)
            const humanTeams = teams.filter(t => !t.isBot);
            if (humanTeams.length > 1) return;
            // Verify request comes from the human
            if (humanTeams[0] && humanTeams[0].id !== teamId) return;

            const player = players[auctionState.currentPlayerIndex];
            if (!player) return;

            const bots = teams.filter(t => t.isBot && t.squad.length < 21 && t.budget > 1.0 && (!player.isForeign || t.foreignCount < 8));
            
            if (bots.length > 0) {
                const lowCostPlayers = [
                    "pathirana", "bishnoi", "mayank yadav", "abhishek porel", "mohsin khan", 
                    "devon conway", "zampa", "mayank agarwal", "rahane", "kane williamson", 
                    "steve smith", "root", "washington", "shubham dubey", "harshit rana", 
                    "shakib"
                ];
                
                const isLowCostTarget = lowCostPlayers.some(name => player.name.toLowerCase().includes(name));
                
                let isUnsold = false;
                let finalBid = 0;
                const baseCr = player.basePrice / 100;

                if (isLowCostTarget) {
                    // 50% chance to just go unsold
                    if (Math.random() < 0.5) {
                        isUnsold = true;
                    } else {
                        // Sold at low price, below 6 CR or very close to base price
                        finalBid = baseCr + Math.random() * Math.min(4.0, 6.0 - baseCr);
                        if (finalBid < baseCr) finalBid = baseCr;
                    }
                } else {
                    // Random price between 2 CR and 11 CR for normal skipped players
                    finalBid = 2.0 + Math.random() * 9.0; 
                    finalBid = Math.max(baseCr, finalBid);
                }

                if (isUnsold) {
                    auctionState.highestBidderId = null;
                } else {
                    const randomBot = bots[Math.floor(Math.random() * bots.length)];
                    
                    // Keep some padding for bot budget 
                    if (finalBid > (randomBot.budget - 3.0)) finalBid = randomBot.budget - 3.0;
                    // Round to nearest 0.25 (standardizing the bid steps)
                    finalBid = Math.max(baseCr, Math.floor(finalBid * 4) / 4);

                    auctionState.currentBid = finalBid;
                    auctionState.highestBidderId = randomBot.id;
                    
                    io.to(roomId).emit("bid-updated", { 
                        currentBid: auctionState.currentBid, 
                        highestBidderId: auctionState.highestBidderId,
                        timer: 0
                    });
                }
            } else {
                auctionState.highestBidderId = null; // Unsold
            }
            
            auctionState.timer = 0; // Trigger round end
        });

        socket.on("start-auction-manually", ({ roomId }) => {
            const room = rooms[roomId];
            if (room && room.auctionState.status === 'lobby') {
                startAuction(roomId);
            }
        });
    });

    function startAuction(roomId) {
        const room = rooms[roomId];
        if (!room) return;
        
        console.log(`[AUCTION] Starting in room ${roomId}...`);
        room.auctionState.status = 'starting';
        let countdown = 5;
        const startInterval = setInterval(() => {
            countdown--;
            io.to(roomId).emit("timer-tick", countdown);
            if (countdown <= 0) {
                clearInterval(startInterval);
                if (room.auctionState.status === 'starting') startNewRound(roomId);
            }
        }, 1000);
    }

    function startNewRound(roomId) {
        const room = rooms[roomId];
        if (!room) return;
        let { auctionState, players, teams } = room;

        if (auctionState.currentPlayerIndex >= players.length) {
            if (!auctionState.isAccelerated) {
                const unsoldPlayers = players.filter(p => p.status === 'unsold' && !p.id.toString().includes('_accel'));
                if (unsoldPlayers.length > 0) {
                    auctionState.isAccelerated = true;
                    const acceleratedPlayers = unsoldPlayers.map(p => ({
                        ...p,
                        id: p.id + '_accel',
                        status: 'pending' 
                    }));
                    room.players = [...players, ...acceleratedPlayers];
                    players = room.players;
                    console.log(`[AUCTION] Starting Accelerated Round for ${acceleratedPlayers.length} players!`);
                } else {
                    auctionState.status = 'finished';
                    console.log(`[AUCTION] Finished in ${roomId}!`);
                    io.to(roomId).emit("auction-finished");
                    return;
                }
            } else {
                auctionState.status = 'finished';
                console.log(`[AUCTION] Finished in ${roomId}!`);
                io.to(roomId).emit("auction-finished");
                return;
            }
        }
        
        const player = players[auctionState.currentPlayerIndex];
        auctionState.status = 'bidding';
        auctionState.currentBid = player.basePrice / 100;
        auctionState.highestBidderId = null;
        auctionState.timer = auctionState.isAccelerated ? 5 : 7;
        
        console.log(`[ROUND] Starting in ${roomId}: ${player.name} (Base: ${auctionState.currentBid} Cr)`);
        io.to(roomId).emit("new-round", { player, currentBid: auctionState.currentBid, timer: auctionState.timer });

        const timerInterval = setInterval(async () => {
            if (auctionState.status !== 'bidding') {
                clearInterval(timerInterval);
                return;
            }

            // Emit tick
            io.to(roomId).emit("timer-tick", auctionState.timer);
            
            if (auctionState.timer <= 0) {
                clearInterval(timerInterval);
                console.log(`[ROUND] Timer finished for ${player.name} in ${roomId}`);
                resolveRound(roomId);
                return;
            }

            // Run bot logic asynchronously every 2 seconds to avoid rate limits
            if (auctionState.timer % 2 === 0) {
                handleBotBids(roomId).catch(err => console.error("[BOT ERROR]", err.message));
            }
            auctionState.timer--;
        }, 1000);
    }

    async function handleBotBids(roomId) {
        const room = rooms[roomId];
        if (!room || room.auctionState.status !== 'bidding') return;
        const { auctionState, teams, players } = room;

        const potentialBots = teams.filter(t => t.isBot && t.id !== auctionState.highestBidderId)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 1); // Check only 1 bot at a time

        for (const team of potentialBots) {
            const player = players[auctionState.currentPlayerIndex];
            if (!player) continue;
            
            const shouldBid = await getBotDecision(team, player, auctionState.currentBid, auctionState.highestBidderId, players);
            
            if (shouldBid && auctionState.status === 'bidding' && auctionState.highestBidderId !== team.id) {
                const nextBid = auctionState.highestBidderId === null ? auctionState.currentBid : auctionState.currentBid + 0.25;
                auctionState.currentBid = parseFloat(nextBid.toFixed(2));
                auctionState.highestBidderId = team.id;
                auctionState.timer = auctionState.isAccelerated ? 5 : 7;
                
                console.log(`[BOT BID] ${team.name} -> ${auctionState.currentBid} Cr`);
                
                io.to(roomId).emit("bid-updated", { 
                    currentBid: auctionState.currentBid, 
                    highestBidderId: auctionState.highestBidderId,
                    timer: auctionState.timer
                });
                break; 
            }
        }
    }

    async function resolveRound(roomId) {
        const room = rooms[roomId];
        if (!room || room.auctionState.status !== 'bidding') return;
        const { auctionState, teams, players } = room;
        
        const player = players[auctionState.currentPlayerIndex];
        if (auctionState.highestBidderId) {
            auctionState.status = 'sold';
            const winner = teams.find(t => t.id === auctionState.highestBidderId);
            winner.budget -= auctionState.currentBid;
            winner.squad.push(player.id);
            if (player.isForeign) winner.foreignCount++;
            player.status = 'sold';
            player.soldPrice = auctionState.currentBid;
            player.teamId = winner.id;
            console.log(`[SOLD] ${player.name} to ${winner.name} for ${auctionState.currentBid} Cr in ${roomId}`);
            io.to(roomId).emit("player-sold", { player, team: winner });
        } else {
            auctionState.status = 'unsold';
            player.status = 'unsold';
            console.log(`[UNSOLD] ${player.name} in ${roomId}`);
            io.to(roomId).emit("player-unsold", { player });
        }
        
        auctionState.currentPlayerIndex++;
        // Persistence - Pass roomId
        saveGameState(auctionState, teams, roomId);
        updatePlayerInDB(player, roomId);
        
        setTimeout(() => startNewRound(roomId), 2000);
    }

    httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
