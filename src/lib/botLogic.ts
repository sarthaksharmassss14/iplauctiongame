export async function getBotDecision(team: any, currentPlayer: any, currentBid: number, highestBidderId: string | null, allPlayers: any[]) {
    if (!currentPlayer) return false;
    if (highestBidderId === team.id) return false;

    // Calculate the actual next bid amount
    const baseInCr = currentPlayer.basePrice / 100;
    const nextBidAmount = highestBidderId === null ? baseInCr : currentBid + 0.25;

    const squad = team.squad || [];
    const minSlotsRemaining = Math.max(0, 15 - squad.length);
    const reservedBudget = Math.max(0, minSlotsRemaining - 1) * 0.3; // Reserve 30L per remaining slot
    const maxAvailableToBid = team.budget - reservedBudget;

    if (nextBidAmount > maxAvailableToBid) return false;
    if (squad.length >= 21) return false; // Max squad size
    if (currentPlayer.isForeign && (team.foreignCount || 0) >= 8) return false; // Foreign limit

    // 1. ASSESSMENT OF TEAM NEEDS (Desperation)
    let isDesperate = false;
    let roleGap = false;

    if (allPlayers) {
        let wkCount = 0, bowlerCount = 0, allRounderCount = 0, batsmanCount = 0;
        const squadPlayers = squad.map((id: number) => allPlayers.find(p => p.id === id)).filter(Boolean);

        for (const p of squadPlayers) {
            if (p.role === "Wicketkeeper") wkCount++;
            else if (p.role === "Bowler") bowlerCount++;
            else if (p.role === "All-rounder") allRounderCount++;
            else if (p.role === "Batsman") batsmanCount++;
        }

        // Check for role gaps
        if (currentPlayer.role === "Wicketkeeper" && wkCount < 1) roleGap = true;
        if (currentPlayer.role === "Batsman" && batsmanCount < 5) roleGap = true;
        if (currentPlayer.role === "Bowler" && bowlerCount < 5) roleGap = true;
        if (currentPlayer.role === "All-rounder" && allRounderCount < 3) roleGap = true;

        // Desperation increases as squad fills up without key roles
        if (roleGap && squad.length >= 10) isDesperate = true;
        if (roleGap && squad.length >= 15) isDesperate = true; // High priority
    }

    // 2. VALUATION BASED ON RATING & PRICE
    // Ratings are 2, 3, 4, 5
    let r = currentPlayer.rating;
    if (r === undefined || r === null) {
        const bp = Number(currentPlayer.basePrice) || 0;
        if (bp >= 200) r = 4;
        else if (bp >= 100) r = 3;
        else r = 2;
    }
    const finalRating = r || 2;
    let valuationMultiplier = 1.0;

    switch (finalRating) {
        case 5: // Elite
            valuationMultiplier = 6.0 + (Math.random() * 4.0); // 6x - 10x
            break;
        case 4: // Star
            valuationMultiplier = 4.0 + (Math.random() * 2.5); // 4x - 6.5x
            break;
        case 3: // Solid
            valuationMultiplier = 2.0 + (Math.random() * 2.0); // 2x - 4x
            break;
        default: // Backup (2 star or less)
            valuationMultiplier = 1.1 + (Math.random() * 0.9); // 1.1x - 2x
            break;
    }

    // Boost multiplier if desperate
    if (isDesperate) valuationMultiplier *= 1.4;
    else if (roleGap) valuationMultiplier *= 1.2;

    // Cap at a reasonable absolute value if too high
    let bidValueLimit = baseInCr * valuationMultiplier;

    // Safety check: Budget constraint
    bidValueLimit = Math.min(bidValueLimit, maxAvailableToBid);

    // AI LLM API Call for high-value decisions
    if (nextBidAmount > 5.0 && Math.random() < 0.15) {
        try {
            const res = await fetch('/api/bot-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName: team.name, budget: team.budget,
                    playerName: currentPlayer.name, playerRole: currentPlayer.role, playerRating: finalRating,
                    baseInCr, currentBid, bidValueLimit, nextBidAmount
                })
            });
            const data = await res.json();
            if (data.decision === false) return false;
        } catch (error) {
            console.error("[BOT LOGIC] AI Decision Error:", error);
        }
    }

    // 3. FINAL DECISION CHANCE
    let chance = 0.5;

    if (nextBidAmount > bidValueLimit) {
        chance = 0.0; // Strict limit based on valuation
    } else {
        // High interest for base price
        if (highestBidderId === null) chance = 0.98;
        else {
            // Decision probability based on how close to limit
            const proximity = nextBidAmount / bidValueLimit;
            if (proximity < 0.5) chance = 0.9;
            else if (proximity < 0.8) chance = 0.8;
            else chance = 0.6;

            // Extra aggressive for 5-star or Desperate roles
            if (finalRating >= 4) chance += 0.1;
            if (isDesperate) chance += 0.1;
        }
    }

    return Math.random() < chance;
}
