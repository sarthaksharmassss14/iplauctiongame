const { Groq } = require("groq-sdk");

// Lazy initialization of Groq to avoid issues if key is missing during startup
let groqInstance = null;

function getGroq() {
    if (!groqInstance && process.env.GROQ_API_KEY) {
        groqInstance = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }
    return groqInstance;
}

async function getBotDecision(team, currentPlayer, currentBid, highestBidderId, allPlayers) {
    if (!currentPlayer) return false;
    if (highestBidderId === team.id) return false; 
    
    // Calculate the actual next bid amount
    const baseInCr = currentPlayer.basePrice / 100;
    const nextBidAmount = highestBidderId === null ? baseInCr : currentBid + 0.25;

    // Slot tracking: Ensure team saves enough budget to reach minimum of 15 players
    // Assume lowest base price is 0.3 Cr
    const minSlotsRemaining = Math.max(0, 15 - team.squad.length);
    const reservedBudget = Math.max(0, minSlotsRemaining - 1) * 0.3;
    const maxAvailableToBid = team.budget - reservedBudget;

    // Hard Rules Checks
    if (nextBidAmount > maxAvailableToBid) return false; // purse constraints
    if (team.squad.length >= 21) return false;           // max squad limit
    if (currentPlayer.isForeign && team.foreignCount >= 8) return false; // max foreign limit
    
    // Determine player value based on name/role (simplified)
    // Stars should be bid on more aggressively
    const isStar = baseInCr >= 1.0; 
    
    // --- DESPERATION LOGIC ---
    let isDesperate = false;
    if (allPlayers && team.squad) {
        let wkCount = 0;
        let bowlerCount = 0;
        let allRounderCount = 0;
        let batsmanCount = 0;
        
        const squadPlayers = team.squad.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
        for (const p of squadPlayers) {
            if (p.role === "Wicketkeeper") wkCount++;
            else if (p.role === "Bowler") bowlerCount++;
            else if (p.role === "All-rounder") allRounderCount++;
            else if (p.role === "Batsman") batsmanCount++;
        }

        const squadSize = team.squad.length;
        let criticalRole = false;
        
        if (currentPlayer.role === "Wicketkeeper" && wkCount === 0) criticalRole = true;
        if (currentPlayer.role === "Bowler" && bowlerCount < 2) criticalRole = true;
        if (currentPlayer.role === "All-rounder" && allRounderCount < 2) criticalRole = true;
        if (currentPlayer.role === "Batsman" && batsmanCount < 3) criticalRole = true;

        // "Smart desperation": Only freak out about a missing role after successfully drafting a core squad of at least 7 players!
        if (criticalRole && squadSize >= 7) {
             isDesperate = true;
        }
    }

    // Check for user-requested heavy bidding targets
    const heavyBiddersList = [
        "virat kohli", "dhoni", "rohit sharma", "bumrah", "buttler", 
        "hardik", "rashid", "kl rahul", "russell", "jadeja", "jaiswal", 
        "travis head", "starc", "maxwell", "boult", "hazelwood", "hazlewood", "sam curran"
    ];
    const isHeavyTarget = heavyBiddersList.some(name => currentPlayer.name.toLowerCase().includes(name));

    // The bots will still participate slightly early on, but just with very low limits.
    const skipChance = isHeavyTarget ? 0.0 : (isStar ? 0.05 : 0.15); // Never skip heavy targets
    if (!isDesperate && Math.random() < skipChance) return false;

    let maxMultiplier = 1.0;
    if (isHeavyTarget) {
        maxMultiplier = 12.0 + Math.random() * 8.0; // Pushes them anywhere from 24cr to 40cr if base price is 2cr!
    } else if (isDesperate) {
        maxMultiplier = isStar ? 8.0 : 4.0; // Desperate to get this player (still capped!)
    } else {
        // Normal bidding limit: Don't go crazy
        const squadRatio = team.squad.length / 21;
        // if they have few players, keep it low (1.2 to 2x base price) 
        // if they have more players but aren't desperate, they still keep limits reasonable
        let baseMultiplier = isStar ? 2.5 : 1.2;
        
        // Add a slight random nudge but keep ceiling under control
        maxMultiplier = baseMultiplier + (Math.random() * (isStar ? 1.5 : 1.0));
    }
    
    // Ensure we don't exceed budget rules though
    const bidValueLimit = Math.min(baseInCr * maxMultiplier, maxAvailableToBid);
    
    // AI LLM API Call
    // ONLY check with LLM if the bid amount is extremely high to see if they'd rationalize going over limit,
    // otherwise disable LLM to prevent it from blindly approving all basic bids
    if (nextBidAmount > 5.0 && Math.random() < 0.1) {
        const groq = getGroq();
        if (groq) {
            try {
                const prompt = `Context: IPL Auction. Team: ${team.name}. Budget: ${team.budget} Cr. Player: ${currentPlayer.name} (${currentPlayer.role}), Base: ${baseInCr}Cr. Current Bid: ${currentBid} Cr. Limit was ${bidValueLimit.toFixed(2)}. Should you do a massive bid of ${nextBidAmount} Cr? Respond ONLY with 'YES' or 'NO'.`;
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }], model: "llama-3.3-70b-versatile",
                });
                const response = chatCompletion.choices[0].message.content.trim().toUpperCase();
                if (response.includes("NO")) return false; // AI says don't do it!
            } catch (error) {
                console.error("[BOT LOGIC] Groq Error:", error.message);
            }
        }
    }

    // --- Fallback Simple Logic ---
    let chance = 0.4;
    
    if (isHeavyTarget) {
        if (nextBidAmount <= bidValueLimit) chance = 0.95; // Fight aggressively till they hit their big limits
        else chance = 0.05;
    } else if (isDesperate) {
        // Desperate bidding logic: up to 90% probability as long as within high limits
        if (nextBidAmount <= bidValueLimit) {
            chance = 0.90; 
        } else {
            chance = 0.10;
        }
    } else {
        // Normal bidding logic
        if (currentBid < baseInCr) chance = 0.90; // highly likely to make the opening bid
        else if (nextBidAmount <= bidValueLimit) chance = 0.35 + (Math.random() * 0.2); // steady low chance to drive price up reasonably
        else chance = 0.01; // almost definitely stops if over limit
    }

    // Random variation
    return Math.random() < chance;
}

module.exports = { getBotDecision };
