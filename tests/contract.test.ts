// Smoke test: inject the fixture through the Fastify handler and assert a
// well-formed BotResponse. No running Vorryn or dev server is required.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createSampleBotApp } from '../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOT_BEARER = 'fixture-bearer';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'play-request.json'), 'utf8')
);

const app = createSampleBotApp(BOT_BEARER, false);
const res = await app.inject({
  method: 'POST',
  url: '/play',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BOT_BEARER}`,
  },
  payload: fixture,
});
await app.close();

if (res.statusCode !== 200) {
  console.error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  process.exit(1);
}

const body = res.json();
if (body.protocolVersion !== 1) {
  console.error(`Expected protocolVersion=1, got ${body.protocolVersion}`);
  process.exit(1);
}

if (body.kind !== 'action') {
  console.error(`Expected kind=action, got ${body.kind}`);
  process.exit(1);
}

const validIds = new Set(fixture.validActions.map((a: { id: string }) => a.id));
if (!validIds.has(body.actionId)) {
  console.error(`actionId ${body.actionId} is not in validActions[]`);
  process.exit(1);
}

console.log(`PASS — bot chose ${body.actionId}`);
