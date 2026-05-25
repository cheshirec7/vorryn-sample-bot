# vorryn-sample-bot

A minimal Vorryn bot, in TypeScript. Implements the `POST /play`
contract described in
[the Vorryn external-bot guide](docs/EXTERNAL_BOT_GUIDE.md).
The included strategy is intentionally simple: pick the first
candidate. Fork this repo, replace the `pickAction` function with your
own logic, deploy.

## What's in here

| File                         | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `src/app.ts`                 | Fastify handler: bearer-auth check, schema parse, `pickAction` dispatch. |
| `src/index.ts`               | Process entrypoint: env setup and HTTP listen.                           |
| `src/strategy.ts`            | The decision function. Replace this.                                     |
| `src/schemas.ts`             | Zod parsers for the request/response envelopes.                          |
| `fixtures/play-request.json` | A single realistic `BotRequest` for local testing.                       |
| `tests/contract.test.ts`     | Smoke test that POSTs the fixture to `/play` and asserts a 200.          |

## Setup

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env
# Edit .env — set BOT_BEARER to a strong random string.
pnpm dev
```

The dev server listens on `http://localhost:3001` and reloads on save.

## Run the smoke test

```bash
pnpm test
```

The test injects `fixtures/play-request.json` through the Fastify
handler with the expected bearer header and asserts the response is
`{ protocolVersion: 1, kind: 'action', actionId: '...' }` with an
`actionId` from the candidate list.

## Registering with Vorryn

Once deployed:

1. Sign in to Vorryn.
2. Visit **Profile → My Bots** (`/profile/bots`).
3. Click **Add bot**.
4. Endpoint URL: your deployed bot's HTTPS URL (e.g. `https://my-bot.fly.dev`).
5. Shared secret: the value of `BOT_BEARER` you set in `.env`.

Other players can now invite your bot to a game.

## Where to put your strategy

`src/strategy.ts` exports `pickAction(req: BotRequest): BotResponse`.
Read the validated request, return the chosen `actionId` (must be one
of `req.validActions[i].id`).

Ideas, ordered from least to most effort:

1. **Random.** `req.validActions[Math.floor(Math.random() * req.validActions.length)].id`.
2. **Greedy heuristic.** Score each candidate with a hand-tuned
   function over the visible state. The Vorryn first-party bot uses
   this approach at scale (~30 score-rule modules).
3. **One-ply lookahead.** Score each candidate's expected outcome by
   simulating one move forward; pick the highest. Costs more time —
   stay under 12s.
4. **Monte Carlo tree search.** Simulate many random rollouts from
   each candidate; pick by win-rate. Works well with a budget of a
   few seconds.

The fixture covers a typical action-phase turn (mid-game, several
build candidates, an `endTurn`). Your strategy must handle:

- **Setup phases** (`state.phase === 'setup1'` / `'setup2'`).
- **Roll phase** (just `rollDice`, plus any pre-roll progress cards).
- **Pending decisions** (`state.pendingDecision !== null` — the
  candidate list is restricted to legal answers).

A trivial fallback is fine for any of these: just pick
`validActions[0]`. Every candidate in the request has already been
validated by Vorryn.

## Deploying

Any HTTPS-capable host with persistent process memory will work. The
sample is small enough for free tiers on Fly.io, Render, or Railway:

```bash
# Fly.io example
fly launch --no-deploy
# Then edit fly.toml: set internal_port = 3001, copy .env into Fly secrets.
fly secrets set BOT_BEARER="<your-secret>"
fly deploy
```

Scale-to-zero serverless (AWS Lambda, Azure Functions on Consumption,
Cloud Run on min-instances=0) will work but expect occasional turn
forfeits on cold starts — the Vorryn server's per-request budget is
12 seconds, and a Node Lambda cold start eats a noticeable chunk of
that. For competitive play, one always-warm instance is worth it.

## License

MIT — do whatever you want with this code.
