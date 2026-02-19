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

let auctionState = {
    currentPlayerIndex: 0,
    currentBid: 0,
    highestBidderId: null,
    timer: 10,
    status: 'idle', 
};

const teamColors = [
    { main: 'var(--csk-yellow)', name: 'Chennai Super Kings' },
    { main: 'var(--mi-blue)', name: 'Mumbai Indians' },
    { main: 'var(--rcb-red)', name: 'Royal Challengers Bengaluru' },
    { main: 'var(--kkr-purple)', name: 'Kolkata Knight Riders' },
    { main: 'var(--dc-blue)', name: 'Delhi Capitals' },
    { main: 'var(--pbks-red)', name: 'Punjab Kings' },
    { main: 'var(--rr-pink)', name: 'Rajasthan Royals' },
    { main: 'var(--srh-orange)', name: 'Sunrisers Hyderabad' },
    { main: 'var(--lsg-teal)', name: 'Lucknow Super Giants' },
    { main: 'var(--gt-blue)', name: 'Gujarat Titans' }
];

let teams = teamColors.map((tc, i) => ({
    id: `team_${i}`,
    name: tc.name,
    owner: `Bot ${i}`,
    budget: 100, 
    squad: [],
    foreignCount: 0,
    color: tc.main,
    isBot: true,
    socketId: null
}));

app.prepare().then(async () => {
    // Load players from DB first
    const dbPlayers = await getPlayersFromDB();
    if (dbPlayers && dbPlayers.length > 0) {
        playersData = dbPlayers;
        console.log(`Loaded ${playersData.length} players from Firebase.`);
    }

    const savedState = await loadGameState();
    if (savedState) {
        auctionState = savedState.auctionState;
        teams = savedState.teams;
    }

    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        socket.on("join-auction", (data) => {
            // Assign user to their selected team if provided and available
            let assignedTeam = null;
            if (data.teamId) {
                const team = teams.find(t => t.id === data.teamId);
                if (team && (team.isBot || team.socketId === null)) {
                    assignedTeam = team;
                }
            }
            
            // Fallback to first available if no selection or selection unavailable
            if (!assignedTeam) {
                assignedTeam = teams.find(t => t.isBot);
            }

            if (assignedTeam) {
                assignedTeam.isBot = false;
                assignedTeam.owner = data.userId || "Human";
                assignedTeam.socketId = socket.id;
                socket.emit("assigned-team", assignedTeam.id);
            }
            socket.emit("init-state", { auctionState, teams, players: playersData });

            // AUTO-START: If auction is idle and a human has joined, wait 5s then start
            if (auctionState.status === 'idle') {
                console.log("Human joined. Starting auction in 5 seconds...");
                setTimeout(() => {
                    if (auctionState.status === 'idle') startNewRound();
                }, 5000);
            }
        });

        socket.on("disconnect", () => {
            const team = teams.find(t => t.socketId === socket.id);
            if (team) {
                team.socketId = null;
            }
        });

        socket.on("place-bid", ({ teamId, bidAmount }) => {
            if (bidAmount > auctionState.currentBid && auctionState.status === 'bidding') {
                auctionState.currentBid = bidAmount;
                auctionState.highestBidderId = teamId;
                auctionState.timer = 10;
                io.emit("bid-updated", { 
                    currentBid: auctionState.currentBid, 
                    highestBidderId: auctionState.highestBidderId,
                    timer: auctionState.timer
                });
            }
        });

        socket.on("start-auction", () => {
            if (auctionState.status === 'idle') startNewRound();
        });
    });

    function startNewRound() {
        if (auctionState.currentPlayerIndex >= playersData.length) {
            auctionState.status = 'finished';
            io.emit("auction-finished");
            return;
        }
        const player = playersData[auctionState.currentPlayerIndex];
        auctionState.status = 'bidding';
        auctionState.currentBid = player.basePrice / 100;
        auctionState.highestBidderId = null;
        auctionState.timer = 10;
        io.emit("new-round", { player, currentBid: auctionState.currentBid, timer: 10 });

        const timerInterval = setInterval(async () => {
            // Emit tick first so UI updates immediately
            io.emit("timer-tick", auctionState.timer);
            
            if (auctionState.timer <= 0) {
                clearInterval(timerInterval);
                resolveRound();
                return;
            }

            // Run bot logic asynchronously
            handleBotBids().catch(err => console.error("Bot Handle Error:", err));
            auctionState.timer--;
        }, 1000);
    }

    async function handleBotBids() {
        if (auctionState.status !== 'bidding') return;

        const potentialBots = teams.filter(t => t.isBot && t.id !== auctionState.highestBidderId)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 3);

        for (const team of potentialBots) {
            const player = playersData[auctionState.currentPlayerIndex];
            if (!player) continue;
            
            const shouldBid = await getBotDecision(team, player, auctionState.currentBid, auctionState.highestBidderId);
            
            if (shouldBid && auctionState.status === 'bidding' && auctionState.highestBidderId !== team.id) {
                auctionState.currentBid = parseFloat((auctionState.currentBid + 0.5).toFixed(2));
                auctionState.highestBidderId = team.id;
                auctionState.timer = 10;
                
                console.log(`[BOT BID] ${team.name} bid ${auctionState.currentBid} Cr for ${player.name}`);
                
                io.emit("bid-updated", { 
                    currentBid: auctionState.currentBid, 
                    highestBidderId: auctionState.highestBidderId,
                    timer: 10
                });
                break; 
            }
        }
    }

    async function resolveRound() {
        const player = playersData[auctionState.currentPlayerIndex];
        if (auctionState.highestBidderId) {
            auctionState.status = 'sold';
            const winner = teams.find(t => t.id === auctionState.highestBidderId);
            winner.budget -= auctionState.currentBid;
            winner.squad.push(player.id);
            if (player.isForeign) winner.foreignCount++;
            player.status = 'sold';
            player.soldPrice = auctionState.currentBid;
            player.teamId = winner.id;
            io.emit("player-sold", { player, team: winner });
            await updatePlayerInDB(player);
        } else {
            auctionState.status = 'unsold';
            player.status = 'unsold';
            io.emit("player-unsold", { player });
            await updatePlayerInDB(player);
        }
        auctionState.currentPlayerIndex++;
        await saveGameState(auctionState, teams);
        setTimeout(startNewRound, 3000);
    }

    httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
