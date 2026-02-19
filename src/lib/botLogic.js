const { Groq } = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "your-groq-key"
});

async function getBotDecision(team, currentPlayer, currentBid, highestBidderId) {
    if (highestBidderId === team.id) return false; // Already highest bidder
    if (team.budget < currentBid + 0.5) return false; // Out of budget
    
    // Limits check
    if (currentPlayer.isForeign && team.foreignCount >= 8) return false;
    if (team.squad.length >= 21) return false;

    // Fast path for simple logic if API key is missing
    if (!process.env.GROQ_API_KEY) {
        const baseInCr = currentPlayer.basePrice / 100;
        // Bots will bid aggressively up to 4x base price, then slow down
        const multiplier = currentBid < (baseInCr * 2.5) ? 6.0 : 3.0;
        const chance = currentBid < (baseInCr * multiplier) ? 0.6 : 0.1;
        return Math.random() < chance;
    }

    try {
        const prompt = `
        You are an AI manager for an IPL team named ${team.name} in a mock auction.
        Current Team Status:
        - Budget: ${team.budget} Cr
        - Players bought: ${team.squad.length}/21
        - Overseas players: ${team.foreignCount}/8

        Current Player being Auctioned:
        - Name: ${currentPlayer.name}
        - Role: ${currentPlayer.role}
        - Base Price: ${currentPlayer.basePrice} Lakhs
        - Nationality: ${currentPlayer.isForeign ? "Foreign" : "Indian"}

        Current Auction State:
        - Current High Bid: ${currentBid} Cr
        - Highest Bidder: ${highestBidderId}

        Should you place a bid of ${currentBid + 0.5} Cr? 
        Consider the player's value and your budget. 
        Respond with ONLY 'YES' or 'NO'.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192",
        });

        const response = chatCompletion.choices[0].message.content.trim().toUpperCase();
        return response.includes("YES");
    } catch (error) {
        console.error("Groq AI Error:", error);
        return false;
    }
}

module.exports = { getBotDecision };
