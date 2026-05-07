import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { config } from './config.js';

let authClient;

export async function getGoogleAuth() {
  if (authClient) return authClient;

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost',
    );
    oauth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    authClient = oauth;
    return authClient;
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    authClient = new google.auth.GoogleAuth({ credentials, scopes });
    return authClient;
  }

  authClient = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes,
  });
  return authClient;
}

export async function calendarClient() {
  return google.calendar({ version: 'v3', auth: await getGoogleAuth() });
}

export async function driveClient() {
  return google.drive({ version: 'v3', auth: await getGoogleAuth() });
}

export async function uploadToDrive({ name, folderId, buffer, mimeType }) {
  const drive = await driveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id,name,webViewLink,webContentLink,parents',
  });
  return res.data;
}

export async function createCalendarEvent({ calendarId, title, start, end, description, location }) {
  const calendar = await calendarClient();
  const res = await calendar.events.insert({
    calendarId: calendarId || config.google.defaultCalendarId,
    requestBody: {
      summary: title || '予定',
      description: description || '',
      location: location || '',
      start: { dateTime: start, timeZone: 'Asia/Tokyo' },
      end: { dateTime: end, timeZone: 'Asia/Tokyo' },
    },
  });
  return res.data;
}

export async function listEvents({ calendarId, timeMin, timeMax }) {
  const calendar = await calendarClient();
  const res = await calendar.events.list({
    calendarId: calendarId || config.google.defaultCalendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });
  return res.data.items || [];
}

export async function updateCalendarEvent({ calendarId, eventId, patch }) {
  const calendar = await calendarClient();
  const res = await calendar.events.patch({
    calendarId: calendarId || config.google.defaultCalendarId,
    eventId,
    requestBody: patch,
  });
  return res.data;
}

export async function deleteCalendarEvent({ calendarId, eventId }) {
  const calendar = await calendarClient();
  await calendar.events.delete({
    calendarId: calendarId || config.google.defaultCalendarId,
    eventId,
  });
}

export async function moveDriveFile({ fileId, folderId }) {
  const drive = await driveClient();
  const current = await drive.files.get({ fileId, fields: 'parents' });
  const previousParents = (current.data.parents || []).join(',');
  const res = await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: previousParents,
    fields: 'id,name,parents',
  });
  return res.data;
}

export async function renameDriveFile({ fileId, name }) {
  const drive = await driveClient();
  const res = await drive.files.update({
    fileId,
    requestBody: { name },
    fields: 'id,name',
  });
  return res.data;
}
