import { google } from 'googleapis';

export async function getGoogleSheets(accessToken: string) {
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  return sheets;
}

export async function getSheetData(accessToken: string, spreadsheetId: string, range: string) {
  try {
    const sheets = await getGoogleSheets(accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export async function updateSheetData(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  try {
    const sheets = await getGoogleSheets(accessToken);
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating sheet data:', error);
    throw error;
  }
}

export async function clearSheetData(accessToken: string, spreadsheetId: string, ranges: string[]) {
  try {
    const sheets = await getGoogleSheets(accessToken);
    const response = await sheets.spreadsheets.values.batchClear({
      spreadsheetId,
      requestBody: {
        ranges,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error clearing sheet data:', error);
    throw error;
  }
}
