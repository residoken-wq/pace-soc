import { NextResponse } from 'next/server';
import { SOC_RULES, SOCRule } from '../../../lib/rules';

// In-memory storage for rule state (would be DB in production)
let customRules: SOCRule[] = [...SOC_RULES];

export async function GET() {
    return NextResponse.json({
        success: true,
        total: customRules.length,
        rules: customRules
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, ruleId, rule } = body;

        if (action === 'toggle' && ruleId) {
            const ruleIndex = customRules.findIndex(r => r.id === ruleId);
            if (ruleIndex !== -1) {
                customRules[ruleIndex].enabled = !customRules[ruleIndex].enabled;
                return NextResponse.json({
                    success: true,
                    message: `Rule ${ruleId} ${customRules[ruleIndex].enabled ? 'enabled' : 'disabled'}`
                });
            }
        }

        if (action === 'create' && rule) {
            const newRule: SOCRule = {
                ...rule,
                id: `CUSTOM-${Date.now()}`
            };
            customRules.push(newRule);
            return NextResponse.json({ success: true, rule: newRule });
        }

        if (action === 'delete' && ruleId) {
            customRules = customRules.filter(r => r.id !== ruleId);
            return NextResponse.json({ success: true, message: `Rule ${ruleId} deleted` });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
