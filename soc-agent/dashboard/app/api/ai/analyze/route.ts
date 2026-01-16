
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { logs } = body;

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return NextResponse.json({ success: false, error: 'No logs provided' }, { status: 400 });
        }

        // 1. Get Settings
        let settings;
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
            settings = JSON.parse(data);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Settings not configured' }, { status: 500 });
        }

        const aiConfig = settings.ai;
        if (!aiConfig || !aiConfig.apiKey) {
            return NextResponse.json({
                success: false,
                error: 'AI API Key is missing. Please configure it in Settings.'
            }, { status: 400 });
        }

        // 2. Prepare Prompt
        const logContent = logs.map(l =>
            `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`
        ).join('\n');

        const prompt = `
You are a SOC Analyst AI. Analyze the following security logs:

${logContent}

---
REQUIREMENTS:
1. Identify any potential security threats, anomalies, or suspicious patterns.
2. If distinct threats are found, map them to MITRE ATT&CK techniques (ID + Name).
3. Assign an overall Risk Score (0-100).
4. Provide a textual Summary of the findings.
5. List actionable Recommendations to mitigate the risks.

OUTPUT FORMAT (JSON only):
{
  "summary": "Brief summary of analysis...",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskScore": number,
  "threats": [
    { "name": "Brute Force", "confidence": "high", "mitre": "T1110" }
  ],
  "insights": ["Observation 1", "Observation 2"],
  "recommendations": ["Action 1", "Action 2"]
}
`;

        // 3. Call Gemini
        const genAI = new GoogleGenerativeAI(aiConfig.apiKey);
        const model = genAI.getGenerativeModel({ model: aiConfig.model || 'gemini-1.5-flash' });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const text = response.text();

        let analysis;
        try {
            analysis = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse AI response:", text);
            return NextResponse.json({ success: false, error: 'Invalid response from AI' }, { status: 500 });
        }

        return NextResponse.json({ success: true, analysis });

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
