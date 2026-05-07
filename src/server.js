import express from 'express';
import { handleLineEvent } from './handlers.js';
import { pushLine, sourceId, verifyLineSignature } from './line.js';
import { config } from './config.js';

const app = express();

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/webhook/line', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.get('x-line-signature');
  if (!verifyLineSignature(req.body, signature)) {
    res.status(401).json({ ok: false, error: 'invalid signature' });
    return;
  }

  const body = JSON.parse(req.body.toString('utf8'));
  res.status(200).json({ ok: true });

  for (const event of body.events || []) {
    handleLineEvent(event).catch(error => {
      console.error('event handling failed', {
        message: error.message,
        stack: error.stack,
        eventId: event.webhookEventId,
      });
      const to = sourceId(event);
      if (to) {
        pushLine(to, [{
          type: 'text',
          text: `❌ 処理に失敗しました。\n${error.message.slice(0, 300)}`,
        }]).catch(pushError => {
          console.error('failed to send error notice', pushError);
        });
      }
    });
  }
});

app.listen(config.port, () => {
  console.log(`LINE bot app listening on :${config.port}`);
});
