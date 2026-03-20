/**
 * Spreadsheet Parser Utility
 * Parses provider pricing spreadsheets for cost analysis
 */

export interface ParsedSpreadsheetRow {
  tourName: string;
  providerName: string;
  cost: number;
  currency: string;
  date?: string;
  [key: string]: string | number | undefined;
}

export async function parseProviderSpreadsheet(file: File): Promise<ParsedSpreadsheetRow[]> {
  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) return [];

    // Parse CSV rows into structured data
    const headers = rows[0];
    const parsedRows: ParsedSpreadsheetRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      // Look for tour name, provider name, and cost columns
      const tourNameIdx = findColumnIndex(headers, ['tour', 'tour_name', 'title']);
      const providerIdx = findColumnIndex(headers, ['provider', 'provider_name', 'company']);
      const costIdx = findColumnIndex(headers, ['cost', 'price', 'amount', 'fee']);
      const currencyIdx = findColumnIndex(headers, ['currency', 'curr']);

      if (tourNameIdx >= 0 && costIdx >= 0) {
        const parsedRow: ParsedSpreadsheetRow = {
          tourName: row[tourNameIdx]?.trim() || 'Unknown',
          providerName: providerIdx >= 0 ? row[providerIdx]?.trim() || 'Unknown' : 'Unknown',
          cost: parseFloat(row[costIdx]?.replace(/[^0-9.-]/g, '')) || 0,
          currency: currencyIdx >= 0 ? row[currencyIdx]?.trim() || 'USD' : 'USD',
        };

        parsedRows.push(parsedRow);
      }
    }

    return parsedRows;
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    throw new Error('Failed to parse spreadsheet');
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      }
    } else {
      currentCell += char;
    }
  }

  // Add final cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  return headers.findIndex(header =>
    possibleNames.some(name =>
      header.toLowerCase().includes(name.toLowerCase())
    )
  );
}
