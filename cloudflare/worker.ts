/**
 * NEXORA AI — Cloudflare Workers Backend (D1 + R2 + Web Crypto)
 * AI Assistant Directory & Publishing Platform (no chatbot/LLM routes).
 * Zero OTP authentication: PBKDF2-SHA256 + HttpOnly SameSite cookies + CSRF validation.
 */

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: { last_row_id?: number; changes?: number } }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface Env {
  DB: D1Database;
  R2_BUCKET?: R2Bucket;
  NEXORA_INITIAL_ADMIN_PASSWORD?: string;
  APP_URL?: string;
}

const SESSION_COOKIE = 'nexora_session';
const INITIAL_ADMIN_EMAIL = 'fawazahmad1949@gmail.com';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(digest);
}

async function hashPassword(password: string): Promise<string> {
  const saltHex = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$100000$${saltHex}$${toHex(bits)}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expectedHex = parts[3];
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(saltHex), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const actual = new Uint8Array(bits);
  const expected = fromHex(expectedHex);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

function parseCookies(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      result[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return result;
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      ...headers,
    },
  });
}

async function ensureSeedAdmin(env: Env) {
  const existing = await env.DB.prepare('SELECT id FROM admins WHERE lower(email) = lower(?)')
    .bind(INITIAL_ADMIN_EMAIL)
    .first();
  if (!existing) {
    const initialPass = env.NEXORA_INITIAL_ADMIN_PASSWORD || 'admin.admin';
    const pwHash = await hashPassword(initialPass);
    await env.DB.prepare('INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
      .bind(INITIAL_ADMIN_EMAIL, 'Fawaz Ahmad', pwHash, 'super_admin')
      .run();
  }
}

async function authenticateAdmin(request: Request, env: Env) {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;
  const tokenHash = await sha256Hex(raw);
  return env.DB.prepare(
    `SELECT s.id as session_id, s.csrf_token, a.id as admin_id, a.email, a.name, a.role, a.last_login_at
     FROM sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`
  )
    .bind(tokenHash)
    .first<{
      session_id: number;
      csrf_token: string;
      admin_id: number;
      email: string;
      name: string;
      role: string;
      last_login_at: string | null;
    }>();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      await ensureSeedAdmin(env);

      // Serve uploaded media from Cloudflare R2
      if (pathname.startsWith('/uploads/') && method === 'GET' && env.R2_BUCKET) {
        const key = pathname.slice('/uploads/'.length);
        const obj = await env.R2_BUCKET.get(key);
        if (!obj) return new Response('Not found', { status: 404 });
        return new Response(obj.body, {
          headers: {
            'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=604800',
          },
        });
      }

      if (pathname === '/api/health') {
        return jsonResponse({ ok: true, mode: 'directory' });
      }

      if (pathname === '/api/public/bootstrap' && method === 'GET') {
        const settings = await env.DB.prepare('SELECT * FROM site_settings WHERE id = 1').first();
        const homepage = await env.DB.prepare('SELECT * FROM homepage_content WHERE id = 1').first();
        const { results: categories } = await env.DB.prepare(
          `SELECT c.*, COUNT(l.id) as listing_count
           FROM categories c LEFT JOIN ai_listings l ON l.category_id = c.id AND l.status = 'published'
           GROUP BY c.id ORDER BY c.sort_order ASC`
        ).all();
        const { results: faqs } = await env.DB.prepare(
          'SELECT * FROM faqs ORDER BY sort_order ASC, id ASC'
        ).all();
        const { results: listings } = await env.DB.prepare(
          `SELECT l.*, c.name as category_name, c.slug as category_slug
           FROM ai_listings l LEFT JOIN categories c ON c.id = l.category_id
           WHERE l.status = 'published' ORDER BY l.is_featured DESC, datetime(l.published_at) DESC`
        ).all();
        return jsonResponse({ settings, homepage, categories, faqs, listings });
      }

      if (pathname.startsWith('/api/listings/') && pathname.endsWith('/visit') && method === 'POST') {
        const slug = pathname.slice('/api/listings/'.length, -'/visit'.length).toLowerCase();
        const listing = await env.DB.prepare(
          "SELECT id, visit_count FROM ai_listings WHERE lower(slug) = ? AND status = 'published'"
        )
          .bind(slug)
          .first<{ id: number; visit_count: number }>();
        if (!listing) return jsonResponse({ error: 'Listing not found.' }, 404);
        await env.DB.prepare('UPDATE ai_listings SET visit_count = visit_count + 1 WHERE id = ?')
          .bind(listing.id)
          .run();
        await env.DB.prepare('INSERT INTO visit_stats (listing_id, referrer, user_agent) VALUES (?, ?, ?)')
          .bind(listing.id, request.headers.get('Referer') || '', request.headers.get('User-Agent') || '')
          .run();
        return jsonResponse({ visit_count: listing.visit_count + 1 });
      }

      if (pathname === '/api/contact' && method === 'POST') {
        const body = (await request.json()) as Record<string, string>;
        const name = (body.name || '').trim();
        const email = (body.email || '').trim();
        const subject = (body.subject || '').trim();
        const message = (body.message || '').trim();
        if (!name || !email.includes('@') || !subject || message.length < 10) {
          return jsonResponse({ error: 'Please complete all contact fields accurately.' }, 400);
        }
        await env.DB.prepare(
          'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
        )
          .bind(name, email, subject, message)
          .run();
        return jsonResponse({ message: 'Your message has been saved.' }, 201);
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = (await request.json()) as { email?: string; password?: string };
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        const admin = await env.DB.prepare('SELECT * FROM admins WHERE lower(email) = lower(?)')
          .bind(email)
          .first<{
            id: number;
            email: string;
            name: string;
            role: string;
            password_hash: string;
            failed_attempts: number;
            locked_until: string | null;
          }>();

        if (!admin) {
          await env.DB.prepare(
            'INSERT INTO activity_logs (admin_email, action, details, status, ip_address) VALUES (?, ?, ?, ?, ?)'
          )
            .bind(email || 'unknown', 'LOGIN_FAILED', 'Unknown email login attempt', 'FAILED', ip)
            .run();
          return jsonResponse({ error: 'Invalid email or password.' }, 401);
        }

        if (admin.locked_until && Date.parse(admin.locked_until + 'Z') > Date.now()) {
          return jsonResponse({ error: 'Account temporarily locked. Try again later.' }, 423);
        }

        const valid = await verifyPassword(password, admin.password_hash);
        if (!valid) {
          const next = (admin.failed_attempts || 0) + 1;
          if (next >= MAX_FAILED_ATTEMPTS) {
            await env.DB.prepare(
              `UPDATE admins SET failed_attempts = ?, locked_until = datetime('now', '+${LOCKOUT_MINUTES} minutes') WHERE id = ?`
            )
              .bind(next, admin.id)
              .run();
          } else {
            await env.DB.prepare('UPDATE admins SET failed_attempts = ? WHERE id = ?')
              .bind(next, admin.id)
              .run();
          }
          return jsonResponse({ error: 'Invalid email or password.' }, 401);
        }

        const rawToken = toHex(crypto.getRandomValues(new Uint8Array(32)));
        const tokenHash = await sha256Hex(rawToken);
        const csrfToken = toHex(crypto.getRandomValues(new Uint8Array(24)));

        await env.DB.prepare(
          `UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?`
        )
          .bind(admin.id)
          .run();

        await env.DB.prepare(
          `INSERT INTO sessions (admin_id, token_hash, csrf_token, ip_address, user_agent, expires_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'))`
        )
          .bind(admin.id, tokenHash, csrfToken, ip, request.headers.get('User-Agent') || '')
          .run();

        const cookieVal = `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=86400`;
        return jsonResponse(
          {
            admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
            csrfToken,
          },
          200,
          { 'Set-Cookie': cookieVal }
        );
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const session = await authenticateAdmin(request, env);
        if (!session) return jsonResponse({ authenticated: false }, 401);
        return jsonResponse({
          authenticated: true,
          admin: {
            id: session.admin_id,
            email: session.email,
            name: session.name,
            role: session.role,
            last_login_at: session.last_login_at,
          },
          csrfToken: session.csrf_token,
        });
      }

      // Protected Admin R2 Image Upload
      if (pathname === '/api/admin/upload' && method === 'POST') {
        const session = await authenticateAdmin(request, env);
        if (!session) return jsonResponse({ error: 'Authentication required.' }, 401);
        if (request.headers.get('X-CSRF-Token') !== session.csrf_token) {
          return jsonResponse({ error: 'Invalid CSRF token.' }, 403);
        }
        if (!env.R2_BUCKET) {
          return jsonResponse({ error: 'Cloudflare R2_BUCKET binding is not configured.' }, 500);
        }

        const body = (await request.json()) as { dataUrl?: string };
        const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl || '');
        if (!match) return jsonResponse({ error: 'Only PNG, JPEG, or WEBP uploads allowed.' }, 400);

        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const bin = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        if (bin.byteLength > 2 * 1024 * 1024) {
          return jsonResponse({ error: 'Image size must be under 2 MB.' }, 400);
        }

        const key = `${crypto.randomUUID()}.${ext}`;
        await env.R2_BUCKET.put(key, bin, {
          httpMetadata: { contentType: `image/${match[1]}` },
        });
        return jsonResponse({ url: `/uploads/${key}` }, 201);
      }

      return jsonResponse({ error: 'Endpoint not found.' }, 404);
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : 'Internal Worker error' }, 500);
    }
  },
};
