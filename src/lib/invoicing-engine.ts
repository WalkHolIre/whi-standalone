import { supabase } from './supabase';
import { generateInvoicePDF, InvoiceData } from './invoice-generator';
import { addDays, format, startOfDay } from 'date-fns';

/**
 * Invoicing Engine
 * Ported from WHI Ground Control functions
 */

export interface InvoicingJobResult {
    success: boolean;
    generatedInvoices: string[];
    errors: Array<{ bookingRef: string; error: string }>;
}

/**
 * Finds bookings departing in exactly X days and generates invoices
 */
export async function runAutomatedInvoicing(daysAhead: number = 37): Promise<InvoicingJobResult> {
    const today = startOfDay(new Date());
    const targetDate = format(addDays(today, daysAhead), 'yyyy-MM-dd');

    const results: InvoicingJobResult = {
        success: true,
        generatedInvoices: [],
        errors: []
    };

    try {
        // 1. Fetch relevant bookings
        // Using Supabase service role would be ideal for a cron job, 
        // but for now we follow the same data structure.
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
        *,
        partner_bookings (
          *,
          partners (
            *,
            partner_contacts (*)
          )
        )
      `)
            .eq('start_date', targetDate)
            .not('status', 'eq', 'Cancelled');

        if (bookingsError) throw bookingsError;
        if (!bookings || bookings.length === 0) return results;

        // 2. Filter for partner bookings and existing invoices
        for (const booking of bookings) {
            const partnerBooking = booking.partner_bookings?.[0];
            if (!partnerBooking) continue;

            // Check for existing invoice
            const { data: existing, error: existingError } = await supabase
                .from('partner_invoices')
                .select('id')
                .eq('booking_id', booking.id)
                .maybeSingle();

            if (existingError) {
                results.errors.push({ bookingRef: booking.booking_reference, error: 'Database check failed' });
                continue;
            }

            if (existing) continue;

            try {
                const partner = partnerBooking.partners;
                const primaryContact = partner.partner_contacts?.find((c: any) => c.is_primary);

                if (!primaryContact) {
                    results.errors.push({ bookingRef: booking.booking_reference, error: 'No primary contact found' });
                    continue;
                }

                // 3. Generate Invoice Number
                const year = today.getFullYear();
                const yearPrefix = `INV-${year}-`;

                const { data: latestInvoice } = await supabase
                    .from('partner_invoices')
                    .select('invoice_number')
                    .like('invoice_number', `${yearPrefix}%`)
                    .order('invoice_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let nextNum = 1;
                if (latestInvoice) {
                    const lastNumStr = latestInvoice.invoice_number.split('-').pop();
                    nextNum = parseInt(lastNumStr) + 1;
                }
                const invoiceNumber = `${yearPrefix}${String(nextNum).padStart(4, '0')}`;

                // 4. Create Invoice Record in DB
                const amount = partnerBooking.b2b_price_applied || booking.total_price;
                const { data: newInvoice, error: invError } = await supabase
                    .from('partner_invoices')
                    .insert({
                        invoice_number: invoiceNumber,
                        partner_id: partner.id,
                        partner_booking_id: partnerBooking.id,
                        booking_id: booking.id,
                        invoice_date: format(today, 'yyyy-MM-dd'),
                        due_date: format(addDays(today, 14), 'yyyy-MM-dd'), // 14 day payment terms
                        amount: amount,
                        sent_to_email: primaryContact.email
                    })
                    .select()
                    .single();

                if (invError) throw invError;

                // 5. Generate Audit Log
                await supabase.from('audit_logs').insert({
                    action: 'GENERATE_INVOICE',
                    entity_type: 'booking',
                    entity_id: booking.id,
                    details: `Automated 37-day invoice generated: ${invoiceNumber}`
                });

                results.generatedInvoices.push(invoiceNumber);
            } catch (e: any) {
                results.errors.push({ bookingRef: booking.booking_reference, error: e.message });
            }
        }
    } catch (e: any) {
        results.success = false;
        results.errors.push({ bookingRef: 'SYSTEM', error: e.message });
    }

    return results;
}
