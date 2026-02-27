export async function getBotDecision(team: any, currentPlayer: any, currentBid: number, highestBidderId: string | null, allPlayers: any[]) {
    if (!currentPlayer) return false;
    if (highestBidderId === team.id) return false;

    // Calculate the actual next bid amount
    const baseInCr = currentPlayer.basePrice / 100;
    const nextBidAmount = highestBidderId === null ? baseInCr : currentBid + 0.25;

    const minSlotsRemaining = Math.max(0, 15 - team.squad.length);
    const reservedBudget = Math.max(0, minSlotsRemaining - 1) * 0.3;
    const maxAvailableToBid = team.budget - reservedBudget;

    if (nextBidAmount > maxAvailableToBid) return false;
    if (team.squad.length >= 21) return false;
    if (currentPlayer.isForeign && team.foreignCount >= 8) return false;

    const isStar = baseInCr >= 1.0;

    let isDesperate = false;
    if (allPlayers && team.squad) {
        let wkCount = 0;
        let bowlerCount = 0;
        let allRounderCount = 0;
        let batsmanCount = 0;

        const squadPlayers = team.squad.map((id: number) => allPlayers.find(p => p.id === id)).filter(Boolean);
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

        if (criticalRole && squadSize >= 7) {
            isDesperate = true;
        }
    }

    const heavyBiddersList = [
        "virat kohli", "dhoni", "rohit sharma", "bumrah", "buttler",
        "hardik", "rashid", "kl rahul", "russell", "jadeja", "jaiswal",
        "travis head", "starc", "maxwell", "boult", "hazelwood", "hazlewood", "sam curran"
    ];
    const isHeavyTarget = heavyBiddersList.some(name => currentPlayer.name.toLowerCase().includes(name));

    const skipChance = isHeavyTarget ? 0.0 : (isStar ? 0.05 : 0.15);
    if (!isDesperate && Math.random() < skipChance) return false;

    let maxMultiplier = 1.0;
    if (isHeavyTarget) {
        maxMultiplier = 12.0 + Math.random() * 8.0;
    } else if (isDesperate) {
        maxMultiplier = isStar ? 5.0 : 3.0;
    } else {
        let baseMultiplier = isStar ? 1.5 : 1.1;
        maxMultiplier = baseMultiplier + (Math.random() * (isStar ? 0.7 : 0.3));
    }

    const bidValueLimit = Math.min(baseInCr * maxMultiplier, maxAvailableToBid);

    // AI LLM API Call
    if (nextBidAmount > 5.0 && Math.random() < 0.1) {
        try {
            const res = await fetch('/api/bot-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName: team.name, budget: team.budget,
                    playerName: currentPlayer.name, playerRole: currentPlayer.role,
                    baseInCr, currentBid, bidValueLimit, nextBidAmount
                })
            });
            const data = await res.json();
            if (data.decision === false) return false; // AI says no
        } catch (error) {
            console.error("[BOT LOGIC] Fetch Error:", error);
        }
    }

    // Fallback Simple Logic 
    let chance = 0.4;

    if (isHeavyTarget) {
        if (nextBidAmount <= bidValueLimit) chance = 0.95;
        else chance = 0.0;
    } else if (isDesperate) {
        if (nextBidAmount <= bidValueLimit) chance = 0.90;
        else chance = 0.0;
    } else {
        if (currentBid < baseInCr) chance = 0.95;
        else if (nextBidAmount <= bidValueLimit) chance = 0.85;
        else chance = 0.0;
    }

    return Math.random() < chance;
}
