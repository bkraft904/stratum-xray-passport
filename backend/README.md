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

Two ways to deploy — pick one.

### Option A: manually, from your own machine

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

### Option B: automatically via GitHub Actions

`.github/workflows/deploy-backend.yml` redeploys this stack on every push to
`backend/**`. It authenticates to AWS via OIDC (a short-lived token GitHub
mints per run) rather than storing long-lived AWS access keys as a repo
secret. One-time setup, run from anywhere you already have AWS CLI
credentials configured:

```bash
cd backend
./bootstrap-github-oidc.sh
```

This creates an IAM role GitHub Actions can assume, scoped to only work from
this repo's `main` branch, with `PowerUserAccess` plus the narrow IAM
permissions SAM needs to create the Lambda's own execution role. It prints a
role ARN at the end.

Then add two **repository secrets** (`Settings → Secrets and variables →
Actions → New repository secret`):

- `AWS_DEPLOY_ROLE_ARN` — the role ARN the script printed
- `ANTHROPIC_API_KEY` — your Anthropic key (this is the one place it needs
  to live for automated deploys — GitHub encrypts it and never exposes it in
  logs, but it's still a secret worth rotating if the repo's collaborator
  list ever changes)

Optionally set a repo **variable** `AWS_REGION` if you don't want the
default `us-east-1`. From then on, pushing changes under `backend/` (or
running the workflow manually) redeploys automatically and prints the
`ApiUrl` in the workflow logs.

## Wire it to the frontend

Set `VITE_ANALYZE_API_URL` to that URL wherever you build the frontend:

- **Local dev:** create `.env.local` in the repo root with `VITE_ANALYZE_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/analyze`
- **GitHub Pages deploy:** add it as a repo secret (`Settings → Secrets and variables → Actions → New repository secret`, name `VITE_ANALYZE_API_URL`) — the deploy workflow already reads it and passes it to the build.

Without this variable set, the Scan Lab falls back to its labeled client-side
demo simulation — the site never breaks, it just isn't doing real analysis
yet.

## Vault: the persistence/ownership layer

The `vault-*` functions turn one-shot Scan Lab analysis into an accumulating,
owned property record: email magic-link sign-in, `Property` and `Scan`
records in DynamoDB, an AI-synthesized report across all of a property's
scans, and a chat endpoint that answers questions using only stored
findings. They share code (auth, DynamoDB client, the vision-analysis
helper) via a Lambda Layer at `layers/vault-shared/`.

### One-time setup this adds

1. **Generate a JWT signing secret** and store it as a GitHub secret named
   `JWT_SECRET`:
   ```bash
   openssl rand -hex 32
   ```
2. **Verify a sending identity in SES** — Vault emails magic sign-in links,
   and Amazon SES refuses to send from (or, in sandbox mode, *to*) an
   unverified address. In the AWS Console: SES → Verified identities →
   Create identity → verify either a single email address or your whole
   domain. Put that address in a repo **variable** named `VAULT_FROM_EMAIL`.
3. **SES sandbox mode**: new AWS accounts start in the SES sandbox, which
   only sends to *verified* recipient addresses — fine for testing with your
   own inbox, but real users won't get their sign-in email until you request
   production access (AWS Console → SES → Account dashboard → Request
   production access; usually approved within a day for this kind of use
   case).
4. Everything else (the four DynamoDB tables, the Lambda layer, the six
   `vault-*` functions) deploys automatically with the rest of the stack —
   no separate `bootstrap` step needed, since the existing GitHub Actions
   role already has `PowerUserAccess`.

### API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/request-link` | POST | — | `{ email }` → emails a 15-minute sign-in link |
| `/auth/verify` | GET | — | `?token=` → returns a 30-day session JWT |
| `/properties` | POST | Bearer | `{ address }` → creates a property |
| `/properties` | GET | Bearer | Lists the caller's properties |
| `/properties/{id}` | GET | Bearer | Property + every scan recorded against it |
| `/properties/{id}/scans` | POST | Bearer | Same payload as `/analyze`, but persists the result |
| `/properties/{id}/report` | GET | Bearer | Synthesizes all scans into one Markdown report |
| `/properties/{id}/ask` | POST | Bearer | `{ question }` → answers from stored findings only |
| `/properties/{id}/checkout` | POST | Bearer | Creates a Stripe Checkout Session for the one-time $49 per-property unlock |
| `/subscription` | GET | Bearer | Caller's subscription tier/status/usage, or `{ subscription: null }` |
| `/subscription/checkout` | POST | Bearer | `{ tier: "solo"\|"crew"\|"company" }` → Stripe subscription Checkout Session |
| `/subscription/portal` | POST | Bearer | Stripe Billing Portal session for managing/canceling |
| `/stripe/webhook` | POST | — | Stripe-only. Handles both one-time and subscription lifecycle events |

Authenticated routes expect `Authorization: Bearer <session JWT>`.

### Subscription tiers

Contractors doing volume work get a monthly plan instead of paying $49 per
property — see `tiers.mjs` (duplicated into each Lambda that needs it, same
self-contained pattern as everywhere else in this backend):

| Tier | Price | Scans/mo | Seats |
|---|---|---|---|
| Solo | $39/mo | 20 | 1 |
| Crew | $99/mo | 100 | 3 |
| Company | $249/mo | Unlimited | 10 |

An active subscription bypasses the per-property paywall entirely; instead
`vault-scans-create` checks the account's monthly scan count against its
tier's cap. Seats are stored as tier metadata for future use — there's no
team/multi-user access control built yet, so today a subscription only
grants scan capacity to the single signed-in account that purchased it.

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
