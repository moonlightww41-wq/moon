import { config, routeFor } from './config.js';
import { createCalendarEvent, deleteCalendarEvent, listEvents, updateCalendarEvent, uploadToDrive } from './google.js';
import { downloadLineContent, pushLine, sourceId } from './line.js';
import { parseCalendarText } from './calendarParser.js';

function textMessage(text) {
  return { type: 'text', text };
}

function parseSystemTemplate(text) {
  const m = String(text || '').match(/【SYSTEM】([\s\S]*?)【\/SYSTEM】/u);
  if (!m) return null;
  const inside = m[1] || '';
  const fn = inside.match(/ファイル名\s*[:：]\s*(.+)\s*$/mu);
  if (!fn) return null;

  const rawName = String(fn[1] || '').trim();
  const content = String(text).replace(m[0], '').trim();
  if (!rawName || !content) return null;

  return {
    fileName: rawName.toLowerCase().endsWith('.txt') ? rawName : `${rawName}.txt`,
    content,
  };
}

function driveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function folderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?usp=drive_link`;
}

function eventStart(e) {
  const value = e?.start?.dateTime || e?.start?.date;
  if (!value) return null;
  return value.length === 10 ? `${value}T00:00:00+09:00` : value;
}

function roughlyMatchesTitle(event, hint) {
  if (!hint) return true;
  return String(event.summary || '').toLowerCase().includes(String(hint).toLowerCase());
}

async function pickTargetEvent(route, op) {
  const now = new Date();
  const start = op.query?.range_start || op.start_at;
  const base = start ? new Date(start) : now;
  const timeMin = new Date(base.getTime() - 180 * 24 * 3600 * 1000).toISOString();
  const timeMax = new Date(base.getTime() + 180 * 24 * 3600 * 1000).toISOString();
  const events = await listEvents({ calendarId: route.calendarId, timeMin, timeMax });
  const hint = op.query?.title_hint || op.title;

  const candidates = events.filter(e => roughlyMatchesTitle(e, hint));
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const da = new Date(eventStart(a) || 0);
    const db = new Date(eventStart(b) || 0);
    return Math.abs(da.getTime() - now.getTime()) - Math.abs(db.getTime() - now.getTime());
  });
  return candidates[0];
}

async function handleCalendarText(event, route, text) {
  const parsed = await parseCalendarText(text);
  const results = [];

  for (const op of parsed.operations) {
    if (op.action === 'add') {
      const created = await createCalendarEvent({
        calendarId: route.calendarId,
        title: op.title || '予定',
        start: op.start_at,
        end: op.end_at,
        location: op.location,
        description: op.description || text,
      });

      if (route.ngCalendarId) {
        await createCalendarEvent({
          calendarId: route.ngCalendarId,
          title: `【NG】 ${op.title || '予定'}`,
          start: op.start_at,
          end: op.end_at,
          description: `[NG枠]\n${text}`,
        });
      }

      results.push(`追加: ${created.summary || op.title || '予定'}`);
      continue;
    }

    if (op.action === 'update') {
      const target = await pickTargetEvent(route, op);
      if (!target) {
        results.push(`修正対象なし: ${op.query?.title_hint || op.title || '予定'}`);
        continue;
      }

      const patch = {
        summary: op.patch?.title ?? target.summary,
        location: op.patch?.location ?? target.location,
        description: op.patch?.description ?? target.description,
      };
      if (op.patch?.start_at) patch.start = { dateTime: op.patch.start_at, timeZone: 'Asia/Tokyo' };
      if (op.patch?.end_at) patch.end = { dateTime: op.patch.end_at, timeZone: 'Asia/Tokyo' };
      const updated = await updateCalendarEvent({ calendarId: route.calendarId, eventId: target.id, patch });
      results.push(`修正: ${updated.summary || target.summary || '予定'}`);
      continue;
    }

    if (op.action === 'delete') {
      const target = await pickTargetEvent(route, op);
      if (!target) {
        results.push(`削除対象なし: ${op.query?.title_hint || op.title || '予定'}`);
        continue;
      }
      await deleteCalendarEvent({ calendarId: route.calendarId, eventId: target.id });
      results.push(`削除: ${target.summary || '予定'}`);
      continue;
    }

    results.push(parsed.notes || '処理対象がありませんでした');
  }

  const to = sourceId(event);
  await pushLine(to, [textMessage(`✅ カレンダー処理完了\n${results.map(x => `・${x}`).join('\n')}`)]);
}

async function handleTxtTemplate(event, route, parsed) {
  const uploaded = await uploadToDrive({
    name: parsed.fileName,
    folderId: route.txtFolderId,
    buffer: Buffer.from(parsed.content, 'utf8'),
    mimeType: 'text/plain; charset=utf-8',
  });

  await pushLine(sourceId(event), [
    textMessage([
      '✅ テキストファイルの作成が完了しました。',
      '',
      '▼ 直接ダウンロード',
      driveDownloadUrl(uploaded.id),
      '',
      '▼ 保存フォルダ',
      folderUrl(route.txtFolderId),
    ].join('\n')),
  ]);
}

async function compressPdfViaCloudConvert({ fileName, buffer }) {
  if (!config.cloudConvertApiKey) return { fileName, buffer };

  const importRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.cloudConvertApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'import-1': { operation: 'import/base64', file: buffer.toString('base64'), filename: fileName },
        'optimize-1': { operation: 'optimize', input: ['import-1'], input_format: 'pdf', profile: 'max' },
        'export-1': { operation: 'export/url', input: ['optimize-1'] },
      },
    }),
  });
  if (!importRes.ok) throw new Error(`CloudConvert create failed: ${await importRes.text()}`);
  const job = await importRes.json();
  const jobId = job.data.id;

  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${config.cloudConvertApiKey}` },
    });
    const polled = await pollRes.json();
    if (polled.data.status === 'error') throw new Error('CloudConvert job failed');
    if (polled.data.status !== 'finished') continue;

    const exportTask = polled.data.tasks.find(t => t.name === 'export-1');
    const url = exportTask?.result?.files?.[0]?.url;
    if (!url) throw new Error('CloudConvert export URL missing');
    const dl = await fetch(url);
    return { fileName: fileName.replace(/\.pdf$/i, '_light.pdf'), buffer: Buffer.from(await dl.arrayBuffer()) };
  }

  throw new Error('CloudConvert timeout');
}

async function handleFile(event, route) {
  const msg = event.message;
  const originalName = msg.fileName || `${msg.id}.bin`;
  const { buffer, contentType } = await downloadLineContent(msg.id);

  const isPdf = contentType.includes('pdf') || originalName.toLowerCase().endsWith('.pdf');
  let uploadName = originalName;
  let uploadBuffer = buffer;
  let mimeType = contentType;

  if (isPdf) {
    const compressed = await compressPdfViaCloudConvert({ fileName: originalName, buffer });
    uploadName = compressed.fileName;
    uploadBuffer = compressed.buffer;
    mimeType = 'application/pdf';
  }

  const uploaded = await uploadToDrive({
    name: uploadName,
    folderId: route.pdfFolderId || config.google.stagingFolderId,
    buffer: uploadBuffer,
    mimeType,
  });

  await pushLine(sourceId(event), [
    textMessage([
      isPdf ? '✅ PDFの保存/軽量化が完了しました。' : '✅ ファイルを保存しました。',
      '',
      `ファイル: ${uploadName}`,
      '',
      '▼ 直接ダウンロード',
      driveDownloadUrl(uploaded.id),
      '',
      '▼ 保存フォルダ',
      folderUrl(route.pdfFolderId || config.google.stagingFolderId),
    ].join('\n')),
  ]);
}

export async function handleLineEvent(event) {
  const toId = sourceId(event);
  const route = routeFor(toId);
  if (!route) return;

  const msg = event.message || {};

  if (msg.type === 'text') {
    const system = parseSystemTemplate(msg.text);
    if (system) {
      await handleTxtTemplate(event, route, system);
      return;
    }
    await handleCalendarText(event, route, msg.text);
    return;
  }

  if (['file', 'image', 'video', 'audio'].includes(msg.type)) {
    await handleFile(event, route);
  }
}
