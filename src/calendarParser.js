import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

function nowJstIso() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().replace('Z', '+09:00');
}

export async function parseCalendarText(text) {
  const now = nowJstIso();
  const response = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'あなたはLINEのラフな日本語からGoogleカレンダー操作JSONを作るアシスタントです。',
          '現在日時はAsia/Tokyo基準です。',
          '「今日」「明日」「来週月曜」「15-16」「15時から16時」などを解釈してください。',
          '曖昧すぎて実行できない場合は action を noop にしてください。',
          '返すJSONは {"operations":[...],"notes":string|null} のみ。',
          'operation schema: {action:"add"|"update"|"delete"|"noop", title:string|null, start_at:string|null, end_at:string|null, location:string|null, description:string|null, query:{title_hint:string|null, range_start:string|null, range_end:string|null}|null, patch:{title:string|null,start_at:string|null,end_at:string|null,location:string|null,description:string|null}|null, delete_all_in_range:boolean|null}',
          '日時は必ず ISO 8601 +09:00 にしてください。例: 2026-05-07T15:00:00+09:00',
          '終了時刻が無いaddは開始から60分後にしてください。',
          '「消して」「削除」「キャンセル」は delete。「変更」「移動」「リスケ」は update。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({ now_jst: now, source_text: text }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return {
    operations: Array.isArray(parsed.operations) ? parsed.operations : [],
    notes: parsed.notes || null,
  };
}
