
import { google } from 'googleapis';

declare var process: any;

const getSanitizedKey = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    let sanitized = key.trim();
    
    // Handle double-escaped or quoted strings from environment providers
    if ((sanitized.startsWith('"') && sanitized.endsWith('"')) || (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
        sanitized = sanitized.substring(1, sanitized.length - 1);
    }
    
    // Standardize newline characters which are often broken in ENV injection
    sanitized = sanitized.replace(/\\n/g, '\n');
    sanitized = sanitized.replace(/\n\s+/g, '\n'); // Remove trailing spaces per line
    
    // Wrap with PEM headers if the user only pasted the middle block
    if (!sanitized.includes('-----BEGIN PRIVATE KEY-----')) {
        sanitized = `-----BEGIN PRIVATE KEY-----\n${sanitized}\n-----END PRIVATE KEY-----`;
    }
    
    return sanitized;
};

const getSpreadsheetId = (): string => {
    const id = process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
    if (!id) throw new Error('MISSING_SPREADSHEET_ID');
    return id.trim().replace(/['"]/g, '');
};

async function getSheetsClient() {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim().replace(/['"]/g, '');
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const privateKey = getSanitizedKey(rawKey);

    if (!clientEmail) throw new Error('MISSING_CLIENT_EMAIL');
    if (!privateKey || privateKey.length < 50) throw new Error('INVALID_PRIVATE_KEY');

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const authClient = await auth.getClient();
        return google.sheets({ version: 'v4', auth: authClient as any });
    } catch (e: any) { 
        throw new Error(`AUTH_FAILURE: ${e.message}`); 
    }
}

export const readSheetData = async (range: string) => {
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        return response.data.values || [];
    } catch (e: any) { 
        console.error("Sheets Read Error:", e.message);
        throw e; 
    }
};

export const appendSheetData = async (range: string, values: any[][]) => {
    if (!values.length) return;
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    } catch (e: any) { throw e; }
};

export const clearAndWriteSheetData = async (range: string, values: any[][]) => {
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.values.clear({ spreadsheetId, range });
        if (values.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            });
        }
    } catch (e: any) { throw e; }
};

export const findAndUpsertRow = async (sheetName: string, id: string, newRowData: any[]) => {
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        let rows: any[][] = [];
        
        try {
            const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
            rows = response.data.values || [];
        } catch (err: any) {
            if (err.message && err.message.includes('Unable to parse range')) {
                // Sheet doesn't exist. Create it.
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: sheetName
                                }
                            }
                        }]
                    }
                });
                // Headers will be missing, but data will be appended. 
                // The user can run SHEET_INITIALIZER.js later to format it.
            } else {
                throw err;
            }
        }

        const rowIndex = rows.findIndex(row => String(row[0]).trim() === String(id).trim());
        
        if (rowIndex !== -1) {
            const targetRange = `${sheetName}!A${rowIndex + 1}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: targetRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [newRowData] },
            });
        } else {
            await appendSheetData(`${sheetName}!A1`, [newRowData]);
        }
    } catch (e: any) { throw e; }
};

export const batchUpsertRows = async (sheetName: string, rowsToUpsert: { id: string, data: any[] }[]) => {
    if (!rowsToUpsert.length) return;
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        
        // Ensure sheet exists
        let existingRows: any[][] = [];
        try {
            const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
            existingRows = response.data.values || [];
        } catch (err: any) {
            if (err.message && err.message.includes('Unable to parse range')) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{ addSheet: { properties: { title: sheetName } } }]
                    }
                });
            } else {
                throw err;
            }
        }

        const dataToUpdate: any[] = [];
        const dataToAppend: any[] = [];

        for (const row of rowsToUpsert) {
            const rowIndex = existingRows.findIndex(r => String(r[0]).trim() === String(row.id).trim());
            if (rowIndex !== -1) {
                dataToUpdate.push({
                    range: `${sheetName}!A${rowIndex + 1}`,
                    values: [row.data]
                });
            } else {
                dataToAppend.push(row.data);
            }
        }

        // Perform batch updates
        if (dataToUpdate.length > 0) {
            // Split into chunks of 50 to avoid large payload errors and stay safe with quota
            for (let i = 0; i < dataToUpdate.length; i += 50) {
                const chunk = dataToUpdate.slice(i, i + 50);
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        valueInputOption: 'USER_ENTERED',
                        data: chunk
                    }
                });
                if (dataToUpdate.length > 50) await new Promise(r => setTimeout(r, 1000)); // 1s delay between chunks
            }
        }

        // Perform append for new rows
        if (dataToAppend.length > 0) {
            for (let i = 0; i < dataToAppend.length; i += 50) {
                const chunk = dataToAppend.slice(i, i + 50);
                await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: chunk }
                });
                if (dataToAppend.length > 50) await new Promise(r => setTimeout(r, 1000)); // 1s delay between chunks
            }
        }
    } catch (e: any) {
        console.error(`Batch Upsert Error (${sheetName}):`, e.message);
        throw e;
    }
};

export const deleteRowById = async (sheetName: string, id: string) => {
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheetsClient();
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
        const sheetId = sheet?.properties?.sheetId;
        if (sheetId === undefined) throw new Error(`Tab "${sheetName}" not found.`);

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => String(row[0]).trim() === String(id).trim());
        
        if (rowIndex === -1) return;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
                    }
                }]
            }
        });
    } catch (e: any) { throw e; }
};
