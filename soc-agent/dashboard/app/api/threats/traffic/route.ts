
import { NextResponse } from 'next/server';

// Simulate traffic data state
let lastUpdate = Date.now();
let currentPPS = 1500;
let currentMbps = 120;
let currentRPS = 250;

export async function GET() {
    // Basic simulation logic: 
    // Vary slightly from last value to create a smooth-ish curve, with random spikes.

    const now = Date.now();
    const timeDiff = (now - lastUpdate) / 1000; // seconds since last call

    // Recovery factor (return to baseline)
    const baselinePPS = 1500;
    const baselineMbps = 100;
    const baselineRPS = 200;

    // Random walk
    currentPPS = currentPPS + (Math.random() - 0.5) * 200;
    currentMbps = currentMbps + (Math.random() - 0.5) * 20;
    currentRPS = currentRPS + (Math.random() - 0.5) * 50;

    // Simulate Spike (DDoS attempt) - 5% chance
    if (Math.random() > 0.95) {
        currentPPS += 5000; // Spike in packets
        currentMbps += 300; // Spike in bandwidth
        currentRPS += 2000; // Spike in requests (L7 flood)
    }

    // Decay towards baseline
    currentPPS = currentPPS * 0.9 + baselinePPS * 0.1;
    currentMbps = currentMbps * 0.9 + baselineMbps * 0.1;
    currentRPS = currentRPS * 0.9 + baselineRPS * 0.1;

    // Ensure non-negative
    currentPPS = Math.max(100, currentPPS);
    currentMbps = Math.max(10, currentMbps);
    currentRPS = Math.max(50, currentRPS);

    lastUpdate = now;

    return NextResponse.json({
        pps: Math.round(currentPPS),
        mbps: Math.round(currentMbps),
        rps: Math.round(currentRPS),
        timestamp: new Date().toISOString()
    });
}
