import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { teamName, players } = body;

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });

        const playerStats = players.map((p: any) => `${p.name} (${p.role}, ${p.country})`).join(', ');

        const prompt = `You are an expert cricket analyst analyzing a T20 squad for the IPL.
Team: ${teamName}
Squad: ${playerStats}

Act as an expert analyst and construct the best playing 11 out of these players. Ensure standard T20 balance regarding batsmen, bowlers, and all-rounders. The playing 11 can have a max of 4 overseas players (country not "India").

Output a strictly valid JSON object with exactly this schema:
{
  "best11": ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5", "Name 6", "Name 7", "Name 8", "Name 9", "Name 10", "Name 11"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const responseContent = chatCompletion.choices[0].message.content;
        return NextResponse.json(JSON.parse(responseContent || "{}"));

    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
