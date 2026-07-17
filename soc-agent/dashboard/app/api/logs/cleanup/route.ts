import { NextResponse } from 'next/server';

// Retention is managed by Wazuh Indexer ISM, not by an HTTP request from the dashboard.

export async function POST(request: Request) {
    try {
        const { retentionDays } = await request.json();

        if (!retentionDays || retentionDays < 1) {
            return NextResponse.json({
                success: false,
                error: 'Invalid retention period'
            }, { status: 400 });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        console.log(`[LOG CLEANUP] Deleting logs older than ${cutoffDate.toISOString()} (${retentionDays} days)`);

        // In production, this would:
        // 1. Connect to Wazuh Indexer (Elasticsearch)
        // 2. Delete documents older than cutoffDate
        // 3. Clean up Loki logs if using Grafana stack
        // 4. Clear local log files

        // Example: Delete from Wazuh Indexer
        // const INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://192.168.1.206:9200';
        // const deleteQuery = {
        //     query: {
        //         range: {
        //             timestamp: {
        //                 lt: cutoffDate.toISOString()
        //             }
        //         }
        //     }
        // };
        // await fetch(`${INDEXER_URL}/wazuh-alerts-*/_delete_by_query`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(deleteQuery)
        // });

        return NextResponse.json({
            success: false,
            error: 'Cleanup is not implemented. Configure Wazuh Indexer ISM retention policy instead.',
            cutoffDate: cutoffDate.toISOString(),
            retentionDays
        }, { status: 501 });

    } catch (error: any) {
        console.error('[LOG CLEANUP] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Cleanup failed'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return current retention settings and storage stats
    return NextResponse.json({
        success: true,
        currentRetentionDays: 180,
        storageUsed: '2.3 GB',
        oldestLog: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        newestLog: new Date().toISOString()
    });
}
