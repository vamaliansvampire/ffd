# NEXORA AI — AI Assistant Directory & Publishing Platform

NEXORA AI is a curated **AI Assistant Directory & Publishing Platform** allowing administrators to publish, organize, showcase, and manage external AI assistants across categories, while visitors browse, search, filter, inspect details, share listings, and visit external AI websites.

---

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (`src/`)
- **Local Full-Stack Server**: Express (`server.ts`) + SQLite (`better-sqlite3`, `server/db.ts`)
- **Cloudflare Edge Stack**:
  - **Cloudflare Pages**: Hosts the compiled `dist/` frontend
  - **Cloudflare Workers**: Backend API (`cloudflare/worker.ts`)
  - **Cloudflare D1**: Relational SQL database (`migrations/0001_initial.sql`)
  - **Cloudflare R2**: Object storage for uploaded AI logos and screenshots

---

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server on port `3000`:
   ```bash
   npm run dev
   ```
3. Build production frontend assets:
   ```bash
   npm run build
   ```

---

## Administrator Access

- Route: `/admin`
- Initial administrator email: `fawazahmad1949@gmail.com`
- Initial temporary password: `admin.admin`
- **Authentication Security**:
  - Email and password only (**no OTP** or email verification codes).
  - PBKDF2-SHA256 salted password hashing (`100,000` iterations).
  - `HttpOnly`, `SameSite=Lax` session cookies + `X-CSRF-Token` validation.
  - IP rate limiting and temporary account lockout after 5 failed attempts.
  - Change the temporary password immediately after signing in under **Admin → Profile & Security**.

---

## Cloudflare Deployment (Pages + Workers + D1 + R2)

1. **Authenticate Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. **Create Cloudflare D1 Database**:
   ```bash
   wrangler d1 create nexora-ai-db
   ```
   Paste the returned `database_id` into `wrangler.toml`.
3. **Apply D1 Migrations**:
   ```bash
   wrangler d1 migrations apply nexora-ai-db --remote
   ```
4. **Create Cloudflare R2 Media Bucket** (for uploaded AI logos & screenshots):
   ```bash
   wrangler r2 bucket create nexora-ai-media
   ```
5. **Configure Optional Worker Secret**:
   ```bash
   wrangler secret put NEXORA_INITIAL_ADMIN_PASSWORD
   ```
6. **Deploy Backend Worker**:
   ```bash
   wrangler deploy
   ```
7. **Build & Deploy Frontend to Cloudflare Pages**:
   ```bash
   npm run build
   wrangler pages deploy dist --project-name nexora-ai
   ```
   Configure custom routes or Pages Functions so `/api/*` and `/uploads/*` proxy to your `nexora-ai-api` Worker.
