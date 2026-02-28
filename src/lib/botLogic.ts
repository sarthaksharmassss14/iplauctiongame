import { Player, Team } from "@/types";

export async function getBotDecision(team: Team, currentPlayer: Player, currentBid: number, highestBidderId: string | null, allPlayers: Player[]) {
    if (!currentPlayer) return false;
    if (highestBidderId === team.id) return false;

    // 1. BASIC CONSTRAINTS
    const squad = team.squad || [];
    const squadSize = squad.length;
    const maxSquadSize = 21;
    const minSquadSize = 15;

    if (squadSize >= maxSquadSize) return false;

    const baseInCr = (currentPlayer.basePrice || 20) / 100;
    const nextBidAmount = highestBidderId === null ? baseInCr : currentBid + 0.25;

    // Reserve 0.2Cr (20 Lakhs) for each remaining slot to reach minimum squad size
    const slotsToMin = Math.max(0, minSquadSize - squadSize);
    const reservedBudget = Math.max(0, slotsToMin - 1) * 0.2;
    const maxAvailableToBid = (team.budget || 0) - reservedBudget;

    if (nextBidAmount > maxAvailableToBid) return false;
    if (currentPlayer.isForeign && (team.foreignCount || 0) >= 8) return false;

    // 2. TEAM NEEDS ASSESSMENT
    let wkCount = 0, bowlerCount = 0, allRounderCount = 0, batsmanCount = 0;
    const squadPlayers = squad.map((id: number) => allPlayers.find(p => p.id === id)).filter((p): p is Player => !!p);

    for (const p of squadPlayers) {
        if (p.role === "Wicketkeeper") wkCount++;
        else if (p.role === "Bowler") bowlerCount++;
        else if (p.role === "All-rounder") allRounderCount++;
        else if (p.role === "Batsman") batsmanCount++;
    }

    const targets = { "Wicketkeeper": 2, "Batsman": 6, "Bowler": 7, "All-rounder": 5 };
    const currentRoleCount = (currentPlayer.role === "Wicketkeeper" ? wkCount :
        currentPlayer.role === "Bowler" ? bowlerCount :
            currentPlayer.role === "All-rounder" ? allRounderCount : batsmanCount);

    const targetRoleCount = targets[currentPlayer.role as keyof typeof targets] || 5;

    let requirementScore = 1.0;
    if (currentRoleCount < 1) requirementScore = 2.5;
    else if (currentRoleCount < targetRoleCount) requirementScore = 1.0 + (targetRoleCount - currentRoleCount) * 0.3;
    else requirementScore = 0.8;

    // 3. PURSE INTENSITY
    const remainingSlots = Math.max(1, maxSquadSize - squadSize);
    const utilizationFactor = Math.min(3.0, Math.max(1.0, (team.budget / remainingSlots) / 1.0));

    // 4. VALUATION LOGIC
    let r = currentPlayer.rating;
    if (!r) {
        if (baseInCr >= 2.0) r = 5;
        else if (baseInCr >= 1.0) r = 4;
        else if (baseInCr >= 0.5) r = 3;
        else r = 2;
    }
    const rating = r || 2;

    const baseMultipliers = { 5: 10.0, 4: 7.0, 3: 4.0, 2: 1.5 };
    let valuationMultiplier = baseMultipliers[rating as keyof typeof baseMultipliers] || 2.0;

    valuationMultiplier *= requirementScore;
    valuationMultiplier *= utilizationFactor;

    // 5. HARD CAPS & REALISM
    let bidValueLimit = baseInCr * valuationMultiplier;

    // Rule: No player should EVER exceed 30 Cr in a 100 Cr budget game
    const ABSOLUTE_MAX_BID = 28.0;

    // Rule: Don't spend more than ~35% of starting budget on ONE player early on
    const budgetSafetyCap = team.budget * 0.4;

    bidValueLimit = Math.min(bidValueLimit, ABSOLUTE_MAX_BID);

    // Only allow exceeding the safety cap if we have a huge budget and only a few slots left
    if (remainingSlots > 5) {
        bidValueLimit = Math.min(bidValueLimit, budgetSafetyCap);
    }

    if (rating === 5) bidValueLimit = Math.max(bidValueLimit, 8.0);
    if (rating === 4) bidValueLimit = Math.max(bidValueLimit, 5.0);

    bidValueLimit = Math.min(bidValueLimit, maxAvailableToBid);

    // 6. FINAL DECISION
    if (nextBidAmount > bidValueLimit) {
        return false;
    }

    let bidProbability = 0.7;
    if (highestBidderId === null) bidProbability = 0.99;
    else {
        const proximity = nextBidAmount / bidValueLimit;
        bidProbability = proximity < 0.5 ? 0.9 : proximity < 0.8 ? 0.7 : 0.4;
    }

    if (requirementScore > 1.8) bidProbability += 0.2;
    return Math.random() < bidProbability;
}


