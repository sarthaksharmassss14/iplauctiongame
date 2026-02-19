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
    if (team.budget < currentBid + 0.5) return false; 
    
    if (currentPlayer.isForeign && team.foreignCount >= 8) return false;
    if (team.squad.length >= 21) return false;

    // --- Simple Probabilistic Logic (Fallback/Default) ---
    const baseInCr = currentPlayer.basePrice / 100;
    
    // Determine player value based on name/role (simplified)
    // Stars should be bid on more aggressively
    const isStar = baseInCr >= 1.5; 
    const maxMultiplier = isStar ? 8.0 : 4.0;
    
    const bidValueLimit = baseInCr * maxMultiplier;
    
    // AI Decision using Groq if available
    const groq = getGroq();
    if (groq) {
        try {
            const prompt = `
            Context: IPL Mock Auction. Team: ${team.name}. budget: ${team.budget} Cr.
            Player: ${currentPlayer.name} (${currentPlayer.role}), Base: ${currentPlayer.basePrice}L, Foreign: ${currentPlayer.isForeign}.
            Current Bid: ${currentBid} Cr. 
            Should you bid ${currentBid + 0.5} Cr? Repond ONLY with 'YES' or 'NO'.
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
    // Higher chance to bid if below limit, lower if above
    let chance = 0.4;
    if (currentBid < baseInCr) chance = 0.8;
    else if (currentBid < bidValueLimit) chance = 0.3;
    else chance = 0.05;

    // Random variation
    return Math.random() < chance;
}

module.exports = { getBotDecision };
