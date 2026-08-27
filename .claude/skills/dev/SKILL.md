---
name: dev
description: Start the frontend dev server with dependency install and venue connectivity check.
---

# Dev Server

Start the Next.js development server for local development.

## Steps

1. **Install dependencies** (from this repo root):
```bash
pnpm install
```

2. **Start dev server:**
```bash
pnpm dev
```

The app starts on **http://localhost:3000**.

3. **Check venue connectivity:**
   - The frontend needs a running Covia venue server (default: `http://localhost:8080`)
   - If no venue is configured, remind the user to start one with `/venue-setup local` in the covia repo
   - Verify with: `curl http://localhost:8080/api/v1/status`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3000 in use | Kill the process or use `pnpm dev -- -p 3001` |
| SDK import errors | Run `pnpm install` — the SDK is fetched from GitHub |
| Venue connection fails | Ensure venue is running on port 8080 |
