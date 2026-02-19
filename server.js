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

const teamData = [
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

let teams = teamData.map((tc, i) => ({
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
        console.log(`[SOCKET] New connection: ${socket.id}`);

        socket.on("join-auction", (data) => {
            console.log(`[SOCKET] User joining: ${data.userId} for team ${data.teamId}`);
            let assignedTeam = null;
            if (data.teamId) {
                const team = teams.find(t => t.id === data.teamId);
                if (team && (team.isBot || team.socketId === null)) {
                    assignedTeam = team;
                }
            }
            
            if (!assignedTeam) {
                assignedTeam = teams.find(t => t.isBot);
            }

            if (assignedTeam) {
                assignedTeam.isBot = false;
                assignedTeam.owner = data.userId || "Human";
                assignedTeam.socketId = socket.id;
                socket.emit("assigned-team", assignedTeam.id);
                console.log(`[SOCKET] Assigned ${assignedTeam.name} to ${socket.id}`);
            }
            socket.emit("init-state", { auctionState, teams, players: playersData });

            if (auctionState.status === 'idle') {
                console.log("[AUCTION] Human joined. Starting rounds in 5 seconds...");
                auctionState.status = 'starting';
                let countdown = 5;
                const startInterval = setInterval(() => {
                    countdown--;
                    io.emit("timer-tick", countdown);
                    if (countdown <= 0) {
                        clearInterval(startInterval);
                        if (auctionState.status === 'starting') startNewRound();
                    }
                }, 1000);
            }
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET] Disconnected: ${socket.id}`);
            const team = teams.find(t => t.socketId === socket.id);
            if (team) {
                team.socketId = null;
            }
        });

        socket.on("place-bid", ({ teamId, bidAmount }) => {
            if (teamId === auctionState.highestBidderId) return; // Prevent self-bidding
            if (bidAmount > auctionState.currentBid && auctionState.status === 'bidding') {
                auctionState.currentBid = bidAmount;
                auctionState.highestBidderId = teamId;
                auctionState.timer = 10;
                console.log(`[BID] Manual bid: ${teamId} -> ${bidAmount} Cr`);
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
            console.log("[AUCTION] Finished!");
            io.emit("auction-finished");
            return;
        }
        
        const player = playersData[auctionState.currentPlayerIndex];
        auctionState.status = 'bidding';
        auctionState.currentBid = player.basePrice / 100;
        auctionState.highestBidderId = null;
        auctionState.timer = 10;
        
        console.log(`[ROUND] Starting: ${player.name} (Base: ${auctionState.currentBid} Cr)`);
        io.emit("new-round", { player, currentBid: auctionState.currentBid, timer: 10 });

        const timerInterval = setInterval(async () => {
            if (auctionState.status !== 'bidding') {
                clearInterval(timerInterval);
                return;
            }

            // Emit tick
            io.emit("timer-tick", auctionState.timer);
            
            if (auctionState.timer <= 0) {
                clearInterval(timerInterval);
                console.log(`[ROUND] Timer finished for ${player.name}`);
                resolveRound();
                return;
            }

            // Run bot logic asynchronously
            handleBotBids().catch(err => console.error("[BOT ERROR]", err.message));
            auctionState.timer--;
        }, 1000);
    }

    async function handleBotBids() {
        if (auctionState.status !== 'bidding') return;

        const potentialBots = teams.filter(t => t.isBot && t.id !== auctionState.highestBidderId)
                                .sort(() => Math.random() - 0.5)
                                .slice(0, 2); 

        for (const team of potentialBots) {
            const player = playersData[auctionState.currentPlayerIndex];
            if (!player) continue;
            
            const shouldBid = await getBotDecision(team, player, auctionState.currentBid, auctionState.highestBidderId);
            
            if (shouldBid && auctionState.status === 'bidding' && auctionState.highestBidderId !== team.id) {
                auctionState.currentBid = parseFloat((auctionState.currentBid + 0.5).toFixed(2));
                auctionState.highestBidderId = team.id;
                auctionState.timer = 10;
                
                console.log(`[BOT BID] ${team.name} -> ${auctionState.currentBid} Cr`);
                
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
        if (auctionState.status !== 'bidding') return;
        
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
            console.log(`[SOLD] ${player.name} to ${winner.name} for ${auctionState.currentBid} Cr`);
            io.emit("player-sold", { player, team: winner });
        } else {
            auctionState.status = 'unsold';
            player.status = 'unsold';
            console.log(`[UNSOLD] ${player.name}`);
            io.emit("player-unsold", { player });
        }
        
        auctionState.currentPlayerIndex++;
        // Persistence is non-blocking now
        saveGameState(auctionState, teams);
        updatePlayerInDB(player);
        
        setTimeout(startNewRound, 2000);
    }

    httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
