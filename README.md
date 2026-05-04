# Tanzifco Conversation Monitor

A Dockerized Next.js dashboard for monitoring AI ↔ customer WhatsApp conversations. Real-time updates via Supabase, password login, search, and conversation flagging.

## Features

- WhatsApp-style chat view, RTL-aware for Arabic
- Real-time updates (no refresh needed) via Supabase Postgres CDC
- Search by phone or message content
- Flag conversations for review
- Single-password login with 7-day session
- Mobile responsive

## Deployment Options

This project is Docker-ready and works on Coolify, Dokku, Railway, Fly.io, or plain `docker compose up`. Coolify instructions below are the main path.

---

## Deploy on Coolify (recommended)

### Prerequisites
- A Coolify instance up and running
- Your Supabase project URL, anon key, and service_role key (same ones your n8n uses)

### Step 1 — Prep your Supabase database

In Supabase → SQL Editor, run this once:

```sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS review_flagged BOOLEAN DEFAULT FALSE;

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

The second line enables real-time push for the table. If it errors with "already member", that's fine.

### Step 2 — Get the code into a git repo

Coolify deploys from a git repo. Easiest path: push this folder to a private GitHub or GitLab repo.

```bash
cd tanzifco-dashboard
git init
git add .
git commit -m "Initial dashboard"
git remote add origin git@github.com:YOUR_USER/tanzifco-dashboard.git
git push -u origin main
```

Or use Coolify's "Public Repository" option if you make the repo public (not recommended — env vars are still protected, but still).

### Step 3 — Create the application in Coolify

1. Coolify dashboard → **+ New** → **Application**
2. Choose your git source (GitHub / GitLab / public URL) and pick the repo
3. **Build Pack:** Select **Dockerfile**
4. **Port:** Set to `3001`
5. **Branch:** `main` (or whatever you pushed to)

### Step 4 — Set environment variables

In the Coolify app's **Environment Variables** tab, add these as **build-time AND runtime**:

| Variable | Value | Build? | Runtime? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key | ❌ | ✅ |
| `DASHBOARD_PASSWORD` | strong password you choose | ❌ | ✅ |
| `AUTH_SECRET` | random 32+ char string (`openssl rand -hex 32`) | ❌ | ✅ |

**Important:** the two `NEXT_PUBLIC_*` variables must be marked as **build-time** because Next.js bakes them into the client bundle at build. The other three only need runtime (and are safer that way).

In Coolify, build-time vars are set with the "Available at Buildtime" toggle ON. Runtime vars have the toggle OFF.

### Step 5 — Configure domain & HTTPS

In the **Domains** section:
- Add your domain (e.g., `dashboard.tanzifco.com`)
- Enable **HTTPS** (Coolify uses Let's Encrypt automatically)
- Make sure your domain's DNS A record points to your Coolify server

### Step 6 — Enable WebSocket forwarding (CRITICAL)

The dashboard uses WebSockets for real-time updates. Coolify's reverse proxy supports this by default, but verify in the app settings:
- **Network** tab → **Direct Domain Connections** should be on
- If you see issues with the live indicator staying gray, check the proxy logs

### Step 7 — Deploy

Click **Deploy**. First build takes 3–5 minutes (Next.js + dependencies). Subsequent deploys are faster due to layer caching.

When build completes, visit your domain. You'll see the login page. Enter the `DASHBOARD_PASSWORD` you set, and you're in.

---

## Deploy with plain Docker / docker-compose

If you don't use Coolify:

```bash
cd tanzifco-dashboard
cp .env.example .env
# edit .env with your real values
docker compose up -d --build
```

Visit `http://your-server:3001`.

---

## Updating the dashboard later

In Coolify: just push to your git branch, and click **Redeploy** (or enable auto-deploy on push).

With docker-compose: `git pull && docker compose up -d --build`.

---

## Usage

- **Sidebar (left):** all customers sorted by most recent message. Click to load thread. Search filters by phone or message content. Toggle "Flagged only" to see just flagged conversations.
- **Thread (right):** WhatsApp-style bubbles. AI messages on the left in cool grey-blue. Customer messages on the right in warm sand. Date headers between days. Click "Flag for review" in top-right to mark the conversation.
- **Live indicator (top-right):** green pulsing dot = real-time connected. New messages from n8n appear instantly.

---

## Troubleshooting

**Live dot stays gray:**
1. Confirm `ALTER PUBLICATION supabase_realtime ADD TABLE conversations;` was run.
2. Check Coolify proxy supports WebSockets (it does by default).
3. Check browser console (F12) for WebSocket connection errors.

**"No conversations yet" but n8n is logging:**
- Verify the table is named `conversations` (lowercase) with columns `id, created_at, phone, direction, message, notes, review_flagged`.
- Check the `SUPABASE_SERVICE_ROLE_KEY` is correct — it bypasses RLS so this should always work.

**Login page won't accept password:**
- Verify `DASHBOARD_PASSWORD` is set in Coolify env vars and the app was redeployed after adding it.
- Confirm `AUTH_SECRET` is set (any long random string).

**Build fails with "Cannot find module 'next/server'":**
- Make sure the Dockerfile `npm install` step runs successfully.
- If you forked/modified the project, ensure `package.json` lists `next` as a dependency.

**Public env vars (Supabase URL/anon) appear empty in browser:**
- They must be set as **build-time** vars in Coolify, not just runtime. Toggle "Available at Buildtime" ON for `NEXT_PUBLIC_*` vars and redeploy.
