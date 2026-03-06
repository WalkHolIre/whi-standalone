import { NextRequest, NextResponse } from 'next/server';
import { runAutomatedInvoicing } from '@/lib/invoicing-engine';

/**
 * API Route: /api/cron/generate-invoices
 * Triggered by a scheduled job (GitHub Actions or Supabase)
 */
export async function GET(req: NextRequest) {
    // 1. Security Check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Run the engine
    try {
        const results = await runAutomatedInvoicing(37); // The 37-day rule

        return NextResponse.json({
            message: 'Invoicing job completed',
            results
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Job failed',
            details: error.message
        }, { status: 500 });
    }
}
