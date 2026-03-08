import { jsPDF } from 'jspdf';

export interface InvoiceData {
    invoiceNumber: string;
    companyName: string;
    companyAddress: string;
    companyVat: string;
    partnerName: string;
    partnerAddress: string;
    tourName: string;
    startDate: string;
    numberOfWalkers: number;
    amount: number;
    dueDate: string;
    bankDetails: {
        name: string;
        iban: string;
        bic: string;
    };
}

/**
 * Generates a PDF invoice using jsPDF
 */
export const generateInvoicePDF = (data: InvoiceData): jsPDF => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.text(data.companyName, 20, 20);
    doc.setFontSize(10);
    doc.text(data.companyAddress, 20, 28);
    doc.text(`VAT: ${data.companyVat}`, 20, 33);

    // Invoice title
    doc.setFontSize(20);
    doc.text('INVOICE', 150, 20);
    doc.setFontSize(10);
    doc.text(data.invoiceNumber, 150, 28);
    doc.text(new Date().toLocaleDateString('en-IE'), 150, 33);

    // Bill to
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 50);
    doc.setFontSize(10);
    doc.text(data.partnerName, 20, 58);
    doc.text(data.partnerAddress, 20, 63);

    // Booking details
    doc.setFontSize(12);
    doc.text('Booking Details:', 20, 100);
    doc.setFontSize(10);
    doc.text(`Tour: ${data.tourName}`, 20, 108);
    doc.text(`Start Date: ${data.startDate}`, 20, 113);
    doc.text(`Number of Guests: ${data.numberOfWalkers}`, 20, 118);

    // Line items
    doc.setFontSize(12);
    doc.text('Description', 20, 145);
    doc.text('Qty', 100, 145);
    doc.text('Unit Price', 130, 145);
    doc.text('Amount', 170, 145);
    doc.line(20, 147, 190, 147);

    const unitPrice = data.amount / data.numberOfWalkers;
    doc.setFontSize(10);
    doc.text(data.tourName, 20, 155);
    doc.text(data.numberOfWalkers.toString(), 100, 155);
    doc.text(`€${unitPrice.toLocaleString()}`, 130, 155);
    doc.text(`€${data.amount.toLocaleString()}`, 170, 155);

    // Total
    doc.line(20, 160, 190, 160);
    doc.setFontSize(12);
    doc.text('Total (EUR):', 130, 170);
    doc.text(`€${data.amount.toLocaleString()}`, 170, 170);

    // Payment terms
    doc.setFontSize(10);
    doc.text(`Due Date: ${data.dueDate}`, 20, 185);

    // Bank details
    doc.setFontSize(12);
    doc.text('Payment Details:', 20, 205);
    doc.setFontSize(10);
    doc.text(`Bank: ${data.bankDetails.name}`, 20, 213);
    doc.text(`IBAN: ${data.bankDetails.iban}`, 20, 218);
    doc.text(`BIC: ${data.bankDetails.bic}`, 20, 223);
    doc.text(`Reference: ${data.invoiceNumber}`, 20, 228);

    return doc;
};
