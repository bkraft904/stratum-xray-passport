# Stratum Scan Lab backend

A single Lambda function behind API Gateway. It receives one or more image
frames (base64), sends them to Claude's vision API, and returns real,
grounded findings about what's visibly identifiable in them — no fabricated
data, no fake pipeline. If the model can't clearly identify construction
elements in the images, it says so in `caveats` instead of inventing
findings.

This is intentionally the smallest possible backend: one function, one
route, no database. It exists to keep the Anthropic API key off the client
— everything else about "processing" happens in a single request/response.

## Prerequisites

1. **AWS CLI** configured with your own AWS account credentials (`aws configure`).
2. **AWS SAM CLI** — [install instructions](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
3. **An Anthropic API key** — console.anthropic.com → Settings → API Keys → Create Key.
4. **Node.js 20+** locally (SAM builds the Lambda's dependencies with it).

## Deploy

```bash
cd backend
sam build
sam deploy --guided
```

`sam deploy --guided` will prompt you for:

- **Stack name** — e.g. `stratum-scan-lab`
- **AWS Region** — pick whatever's closest to you
- **Parameter `AnthropicApiKey`** — paste your key (it's stored `NoEcho`, so it won't be echoed to the terminal or shown in the CloudFormation console — but it IS stored as a plain Lambda environment variable, visible to anyone with IAM read access to this Lambda. That's fine for a personal project; if this ever has other AWS users with console access, move it to Secrets Manager instead)
- **Parameter `AllowedOrigin`** — your deployed site's origin, e.g. `https://bkraft904.github.io` (no trailing slash)
- Accept the defaults for the rest (confirm changeset: Y, save arguments to `samconfig.toml`: Y)

When it finishes, copy the **`ApiUrl`** output — that's your endpoint.

## Wire it to the frontend

Set `VITE_ANALYZE_API_URL` to that URL wherever you build the frontend:

- **Local dev:** create `.env.local` in the repo root with `VITE_ANALYZE_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/analyze`
- **GitHub Pages deploy:** add it as a repo secret (`Settings → Secrets and variables → Actions → New repository secret`, name `VITE_ANALYZE_API_URL`) — the deploy workflow already reads it and passes it to the build.

Without this variable set, the Scan Lab falls back to its labeled client-side
demo simulation — the site never breaks, it just isn't doing real analysis
yet.

## Cost & limits

- Model: `claude-opus-5`. Each analysis request sends up to 4 images and
  costs roughly what a single vision request of that size costs at Opus
  pricing — check current rates at anthropic.com/pricing before opening
  this up to real traffic.
- The Lambda rejects requests with more than 4 images or any image over 5MB
  (see `analyze/index.mjs`) to keep individual request cost and latency
  bounded. There's no rate limiting or auth on the endpoint itself — for a
  public demo, consider adding API Gateway usage plans/throttling or a
  lightweight shared secret before sharing the URL widely.

## Local testing without deploying

```bash
cd backend/analyze
npm install
ANTHROPIC_API_KEY=sk-ant-... node -e "
import('./index.mjs').then(async (m) => {
  const fs = await import('fs');
  const data = fs.readFileSync('/path/to/a/test/photo.jpg').toString('base64');
  const res = await m.handler({
    requestContext: { http: { method: 'POST' } },
    body: JSON.stringify({ images: [{ data, mediaType: 'image/jpeg' }] }),
  });
  console.log(res.statusCode, res.body);
});
"
```

## Tear down

```bash
sam delete
```
