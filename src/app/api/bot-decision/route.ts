import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { teamName, budget, playerName, playerRole, baseInCr, currentBid, bidValueLimit, nextBidAmount } = body;

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ decision: false }); // Fallback
        }

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });

        const prompt = `Context: IPL Auction. Team: ${teamName}. Budget: ${budget} Cr. Player: ${playerName} (${playerRole}), Base: ${baseInCr}Cr. Current Bid: ${currentBid} Cr. Limit was ${bidValueLimit.toFixed(2)}. Should you do a massive bid of ${nextBidAmount} Cr? Respond ONLY with 'YES' or 'NO'.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }], model: "llama-3.3-70b-versatile",
        });

        const response = chatCompletion.choices[0].message.content?.trim().toUpperCase() || "NO";
        return NextResponse.json({ decision: response.includes("YES") });

    } catch (error: any) {
        console.error("Bot Groq Error:", error.message);
        return NextResponse.json({ decision: false }, { status: 500 });
    }
}
