import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  line: {
    channelSecret: required('LINE_CHANNEL_SECRET'),
    channelAccessToken: required('LINE_CHANNEL_ACCESS_TOKEN'),
  },
  openai: {
    apiKey: required('OPENAI_API_KEY'),
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  },
  google: {
    defaultCalendarId: process.env.DEFAULT_CALENDAR_ID || 'primary',
    stagingFolderId: process.env.DRIVE_STAGING_FOLDER_ID || '',
    processedFolderId: process.env.PROCESSED_FOLDER_ID || '',
    spreadsheetId: process.env.SPREADSHEET_ID || '',
  },
  cloudConvertApiKey: process.env.CLOUDCONVERT_API_KEY || '',
};

export const routes = {
  C9a026e976aa9c350eb795e4f9ef2ba78: {
    user: '本橋',
    calendarId: process.env.CAL_MOTOHASHI || config.google.defaultCalendarId,
    pdfFolderId: '1dlWtuCJa-7Po4z4PYSdl-BBrXOf9ZnIt',
    txtFolderId: '1LNAxiixZIM6292EYD4ND0OAhVvqZWFh9',
  },
  C4344f1816052b93a687fb4eddc7e5c2e: {
    user: '遠藤',
    calendarId: process.env.CAL_ENDO || config.google.defaultCalendarId,
    ngCalendarId: process.env.CAL_ENDO_NG || '',
    pdfFolderId: '16LwrGGPyYMIYSJ3ZAB9XwPYAN8GeGDKx',
    txtFolderId: '1z6q6KEISUj_5v1hF1Sq9EtLX9jGGzzS9',
  },
  C2eea18bc0ec43c09d0ecdb39f1facb58: {
    user: '黒澤',
    calendarId: process.env.CAL_KUROSAWA || config.google.defaultCalendarId,
    pdfFolderId: '1_zmgC4hABEwxkpex7LqvU4zhKe7qaNju',
    txtFolderId: '1bh2wdcWv201XDzJCCso5sCgrYgcZUWqY',
  },
  U24d3c2684b079aff6d37eeea9305b2d2: {
    user: '三谷',
    calendarId: process.env.CAL_MITANI || config.google.defaultCalendarId,
    pdfFolderId: '1Y6onnIws--Hk1JMMbLf182aMab7VTUFQ',
    txtFolderId: '1sfgGE7xpM1LelgybBNgItoCzL5rJCo7X',
  },
  Cf6fab69b3004cbb7244b40d56df18a9f: {
    user: '竹村',
    calendarId: process.env.CAL_TAKEMURA || config.google.defaultCalendarId,
    pdfFolderId: '1a_Xk-bPUHo9HkzBATY7zXbpXlsYLnYtt',
    txtFolderId: '1OjYZji9vpnpv9A2QVBjHOTDDTCcAw36V',
  },
};

export function routeFor(sourceId) {
  return routes[sourceId] || null;
}
