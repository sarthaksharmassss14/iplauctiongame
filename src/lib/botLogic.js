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

async function getBotDecision(team, currentPlayer, currentBid, highestBidderId) {
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
    const isStar = baseInCr >= 1.5; 
    const maxMultiplier = isStar ? 8.0 : 4.0;
    
    const bidValueLimit = baseInCr * maxMultiplier;
    
    // AI Decision using Groq if available (only call 30% of the time to respect rate limits)
    const groq = getGroq();
    if (groq && Math.random() < 0.3) {
        try {
            const prompt = `
            Context: IPL Mock Auction. Team: ${team.name}. Budget: ${team.budget} Cr.
            Player: ${currentPlayer.name} (${currentPlayer.role}), Base: ${baseInCr}Cr, Foreign: ${currentPlayer.isForeign}.
            Current Bid: ${currentBid} Cr. 
            Should you bid ${nextBidAmount} Cr? Respond ONLY with 'YES' or 'NO'.
            `;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
            });

            const response = chatCompletion.choices[0].message.content.trim().toUpperCase();
            if (response.includes("YES")) return true;
            if (response.includes("NO")) return false;
        } catch (error) {
            console.error("[BOT LOGIC] Groq Error (falling back to simple logic):", error.message);
        }
    }

    // --- Fallback Simple Logic ---
    // Make the bots aim for 95-99% purse utilization by increasing chance to bid if budget is high
    let chance = 0.4;
    
    // Aggressive bidding if budget is high
    if (maxAvailableToBid > 15.0 && nextBidAmount < bidValueLimit) chance += 0.3;
    
    if (currentBid < baseInCr) chance = 0.85;
    else if (nextBidAmount < bidValueLimit) chance = Math.min(0.8, chance + 0.2);
    else chance = 0.05;

    // Random variation
    return Math.random() < chance;
}

module.exports = { getBotDecision };
