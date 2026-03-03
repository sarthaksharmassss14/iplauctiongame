import { Player, Team } from "@/types";

export async function getBotDecision(team: Team, currentPlayer: Player, currentBid: number, highestBidderId: string | null, allPlayers: Player[]) {
    if (!currentPlayer) return false;
    if (highestBidderId === team.id) return false;

    // 1. BASIC CONSTRAINTS
    const squad = team.squad || [];
    const squadSize = squad.length;
    const maxSquadSize = 21; // Standard IPL max
    const minSquadSize = 15; // Target squad size

    if (squadSize >= 21) return false; // Bot soft cap at 21

    const baseInCr = (Number(currentPlayer.basePrice) || 20) / 100;
    const nextBidAmount = !highestBidderId ? baseInCr : currentBid + 0.25;

    // Minimum buffer: 0.20Cr per remaining slot to reach 15 players (more aggressive utilization)
    const slotsToMin = Math.max(0, minSquadSize - squadSize);
    const reservedBudget = Math.max(0, slotsToMin - 1) * 0.20;
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

    const targets: Record<string, number> = { "Wicketkeeper": 2, "Batsman": 6, "Bowler": 6, "All-rounder": 4 };
    const currentRoleCount = (currentPlayer.role === "Wicketkeeper" ? wkCount :
        currentPlayer.role === "Bowler" ? bowlerCount :
            currentPlayer.role === "All-rounder" ? allRounderCount : batsmanCount);

    const targetRoleCount = targets[currentPlayer.role as keyof typeof targets] || 5;

    // If already have enough depth, bots should be very passive
    if (currentRoleCount >= targetRoleCount + 2) return false;

    let requirementScore = 1.0;
    if (currentRoleCount === 0) requirementScore = 2.5; // High priority for first player of role
    else if (currentRoleCount < targetRoleCount) requirementScore = 1.5; // Core building
    else requirementScore = 0.4; // Depth only

    // 3. PURSE UTILIZATION (Aim for 95-100% spend)
    const remainingSlots = Math.max(1, 18 - squadSize); // Target 18 slots total for budget calculation
    const avgBudgetPerSlot = team.budget / remainingSlots;
    let utilizationFactor = Math.min(2.5, Math.max(0.6, avgBudgetPerSlot / 1.5));

    // 4. VALUATION LOGIC (STRICT 18 CR CAP)
    let rating = currentPlayer.rating || 2;
    if (!currentPlayer.rating) {
        if (baseInCr >= 2.0) rating = 5;
        else if (baseInCr >= 1.0) rating = 4;
        else rating = 2;
    }

    // Base Multipliers for 100 Cr Budget
    const baseMultipliers: Record<number, number> = { 5: 8.5, 4: 5.5, 3: 3.5, 2: 1.5 };
    let valuationMultiplier = baseMultipliers[rating] || 2.0;

    // Scaling Factor to use 95-100% of purse
    const finalMultiplier = valuationMultiplier * requirementScore * utilizationFactor;

    // 5. HARD CAPS & REALISM
    let bidValueLimit = baseInCr * finalMultiplier;

    // HARD CAPS (User Rule: Max 18 Cr)
    const ABSOLUTE_MAX_BID = 18.0;
    const ratingCaps: Record<number, number> = { 5: 18.0, 4: 12.0, 3: 7.0, 2: 3.5 };
    const hardCap = Math.min(ABSOLUTE_MAX_BID, ratingCaps[rating] || 5.0);

    bidValueLimit = Math.min(bidValueLimit, hardCap);

    // Budget Protection: Be aggressive early
    const safetyCap = team.budget * 0.7; // Bots can spend up to 70% of remaining purse for a marquee (previously 50%)
    if (remainingSlots > 12) {
        bidValueLimit = Math.min(bidValueLimit, safetyCap);
    }

    bidValueLimit = Math.min(bidValueLimit, maxAvailableToBid);

    // 6. FINAL DECISION
    if (nextBidAmount > bidValueLimit) return false;

    // AI DECISION FOR STAR PLAYERS OR HIGH BIDS
    if (rating >= 5 || nextBidAmount >= 5.0) {
        try {
            console.log(`[AI] Consulting Groq for ${currentPlayer.name} at ${nextBidAmount} Cr...`);
            const response = await fetch('/api/bot-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName: team.name,
                    budget: team.budget,
                    playerName: currentPlayer.name,
                    playerRole: currentPlayer.role,
                    baseInCr,
                    currentBid,
                    bidValueLimit,
                    nextBidAmount
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[AI] Groq Response for ${currentPlayer.name}: ${data.decision ? 'YES' : 'NO'}`);
                return data.decision;
            }
        } catch (error) {
            console.error("[AI] Groq API Failed, falling back to local math:", error);
        }
    }

    // Probability logic (fallback or for non-star players)
    let bidProbability = 0.90; // Higher default probability
    const pricePressure = nextBidAmount / bidValueLimit;

    if (!highestBidderId) {
        bidProbability = 0.99; // Almost always take base price if not bidding
    } else {
        if (pricePressure > 0.95) bidProbability = 0.15;
        else if (pricePressure > 0.8) bidProbability = 0.45;
        else if (pricePressure > 0.6) bidProbability = 0.75;
        else bidProbability = 0.95; // Very aggressive when price is low relative to valuation
    }

    // If desperate for role, increase probability
    if (currentRoleCount === 0 && pricePressure < 0.98) bidProbability = 0.98;

    return Math.random() < bidProbability;
}
