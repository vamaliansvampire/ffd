import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import {
  createRateLimiter,
  generateOpaqueToken,
  getClientIp,
  hashPassword,
  isHttpsRequest,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_HOURS,
  sha256Hex,
  verifyPassword,
} from './server/auth.ts';
import {
  getCategoriesWithCounts,
  getDb,
  getFaqs,
  getHomepageContent,
  getSiteSettings,
  logActivity,
  mapListingRow,
} from './server/db.ts';

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeUrlOrPath(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isSafeExternalUrl(value);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

interface AuthenticatedRequest extends Request {
  adminSession?: {
    sessionId: number;
    adminId: number;
    email: string;
    name: string;
    role: string;
    lastLoginAt: string | null;
    csrfToken: string;
  };
}

async function startServer() {
  const db = getDb();
  const app = express();
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '3mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

  const loginLimiter = createRateLimiter('login', 12, 15 * 60 * 1000);
  const contactLimiter = createRateLimiter('contact', 10, 15 * 60 * 1000);
  const visitLimiter = createRateLimiter('visit', 60, 5 * 60 * 1000);

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const tokenHash = sha256Hex(rawToken);
    const sessionRow = db
      .prepare(
        `SELECT s.id as session_id, s.csrf_token, s.expires_at,
                a.id as admin_id, a.email, a.name, a.role, a.last_login_at
         FROM sessions s
         JOIN admins a ON a.id = s.admin_id
         WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`
      )
      .get(tokenHash) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (typeof csrfHeader !== 'string' || csrfHeader !== String(sessionRow.csrf_token)) {
        return res.status(403).json({ error: 'Invalid CSRF token.' });
      }
    }

    req.adminSession = {
      sessionId: Number(sessionRow.session_id),
      adminId: Number(sessionRow.admin_id),
      email: String(sessionRow.email),
      name: String(sessionRow.name),
      role: String(sessionRow.role),
      lastLoginAt: sessionRow.last_login_at ? String(sessionRow.last_login_at) : null,
      csrfToken: String(sessionRow.csrf_token),
    };

    return next();
  };

  // ==================== PUBLIC DIRECTORY ENDPOINTS ====================

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'directory' });
  });

  app.get('/api/public/bootstrap', (_req, res) => {
    const settings = getSiteSettings(db);
    const homepage = getHomepageContent(db);
    const categories = getCategoriesWithCounts(db);
    const faqs = getFaqs(db);
    const rows = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l
         LEFT JOIN categories c ON c.id = l.category_id
         WHERE l.status = 'published'
         ORDER BY l.is_featured DESC, datetime(l.published_at) DESC, l.id DESC`
      )
      .all() as Array<Record<string, unknown>>;

    res.json({
      settings,
      homepage,
      categories,
      faqs,
      listings: rows.map(mapListingRow),
    });
  });

  app.get('/api/listings', (req, res) => {
    const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const featuredOnly = req.query.featured === 'true';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

    const rows = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l
         LEFT JOIN categories c ON c.id = l.category_id
         WHERE l.status = 'published'`
      )
      .all() as Array<Record<string, unknown>>;

    let items = rows.map(mapListingRow);

    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.short_description.toLowerCase().includes(search) ||
          item.full_description.toLowerCase().includes(search) ||
          item.creator_name.toLowerCase().includes(search) ||
          item.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    if (category && category !== 'all') {
      items = items.filter((item) => item.category_slug?.toLowerCase() === category);
    }

    if (featuredOnly) {
      items = items.filter((item) => item.is_featured);
    }

    if (sort === 'popular') {
      items.sort((a, b) => b.visit_count - a.visit_count || b.id - a.id);
    } else if (sort === 'featured') {
      items.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.id - a.id);
    } else if (sort === 'name_asc') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // newest
      items.sort(
        (a, b) =>
          Date.parse(b.published_at || b.created_at) - Date.parse(a.published_at || a.created_at) ||
          b.id - a.id
      );
    }

    res.json({ listings: items });
  });

  app.get('/api/listings/:slug', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const row = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l
         LEFT JOIN categories c ON c.id = l.category_id
         WHERE lower(l.slug) = ? AND l.status = 'published'`
      )
      .get(slug) as Record<string, unknown> | undefined;

    if (!row) {
      return res.status(404).json({ error: 'AI listing not found.' });
    }

    res.json({ listing: mapListingRow(row) });
  });

  app.post('/api/listings/:slug/visit', visitLimiter, (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const row = db
      .prepare("SELECT id, visit_count FROM ai_listings WHERE lower(slug) = ? AND status = 'published'")
      .get(slug) as { id: number; visit_count: number } | undefined;

    if (!row) {
      return res.status(404).json({ error: 'AI listing not found.' });
    }

    db.prepare('UPDATE ai_listings SET visit_count = visit_count + 1 WHERE id = ?').run(row.id);
    db.prepare('INSERT INTO visit_stats (listing_id, referrer, user_agent) VALUES (?, ?, ?)').run(
      row.id,
      String(req.headers.referer || '').slice(0, 255),
      String(req.headers['user-agent'] || '').slice(0, 255)
    );

    res.json({ visit_count: row.visit_count + 1 });
  });

  // ==================== PUBLIC CONTACT FORM ====================

  app.post('/api/contact', contactLimiter, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Please enter your name (2–100 characters).' });
    }
    if (!isValidEmail(email) || email.length > 160) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (subject.length < 2 || subject.length > 160) {
      return res.status(400).json({ error: 'Please provide a subject (2–160 characters).' });
    }
    if (message.length < 10 || message.length > 4000) {
      return res.status(400).json({ error: 'Message must be between 10 and 4000 characters.' });
    }

    const result = db
      .prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
      .run(name, email, subject, message);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Your message has been received. Our team will respond shortly.',
    });
  });

  // ==================== ADMIN AUTHENTICATION (EMAIL + PASSWORD ONLY, NO OTP) ====================

  app.post('/api/auth/login', loginLimiter, (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const ip = getClientIp(req);

    if (!email || !password || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email and password are required.' });
    }

    const admin = db
      .prepare('SELECT * FROM admins WHERE lower(email) = lower(?)')
      .get(email) as Record<string, unknown> | undefined;

    if (!admin) {
      logActivity(db, email, 'LOGIN_FAILED', 'Unknown administrator email attempted login', 'FAILED', ip);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (admin.locked_until) {
      const lockedUntilMs = Date.parse(String(admin.locked_until) + 'Z');
      if (!Number.isNaN(lockedUntilMs) && lockedUntilMs > Date.now()) {
        const minsLeft = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 60000));
        logActivity(db, email, 'LOGIN_LOCKED', 'Blocked login attempt during temporary lockout', 'LOCKED', ip);
        return res.status(423).json({
          error: `Account temporarily locked due to repeated failed attempts. Try again in ${minsLeft} minute(s).`,
        });
      }
    }

    const valid = verifyPassword(password, String(admin.password_hash));
    if (!valid) {
      const nextAttempts = Number(admin.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        db.prepare(
          `UPDATE admins SET failed_attempts = ?, locked_until = datetime('now', '+${LOCKOUT_MINUTES} minutes'), updated_at = datetime('now') WHERE id = ?`
        ).run(nextAttempts, admin.id);
        logActivity(
          db,
          email,
          'LOGIN_LOCKED',
          `Account locked for ${LOCKOUT_MINUTES} minutes after ${nextAttempts} failed login attempts`,
          'LOCKED',
          ip
        );
        return res.status(423).json({
          error: `Too many failed login attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }

      db.prepare(`UPDATE admins SET failed_attempts = ?, updated_at = datetime('now') WHERE id = ?`).run(
        nextAttempts,
        admin.id
      );
      logActivity(
        db,
        email,
        'LOGIN_FAILED',
        `Invalid password attempt (${nextAttempts}/${MAX_FAILED_ATTEMPTS})`,
        'FAILED',
        ip
      );
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    db.prepare(
      `UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(admin.id);

    db.prepare(`DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')`).run();

    const rawSessionToken = generateOpaqueToken(32);
    const tokenHash = sha256Hex(rawSessionToken);
    const csrfToken = generateOpaqueToken(24);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 255);

    db.prepare(
      `INSERT INTO sessions (admin_id, token_hash, csrf_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+${SESSION_TTL_HOURS} hours'))`
    ).run(admin.id, tokenHash, csrfToken, ip, userAgent);

    logActivity(db, String(admin.email), 'LOGIN_SUCCESS', 'Administrator signed in', 'SUCCESS', ip);

    res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      path: '/',
      maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
    });

    res.json({
      admin: {
        id: Number(admin.id),
        email: String(admin.email),
        name: String(admin.name),
        role: String(admin.role),
        last_login_at: new Date().toISOString(),
      },
      csrfToken,
    });
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(401).json({ authenticated: false });
    }

    const tokenHash = sha256Hex(rawToken);
    const sessionRow = db
      .prepare(
        `SELECT s.csrf_token, a.id, a.email, a.name, a.role, a.last_login_at
         FROM sessions s
         JOIN admins a ON a.id = s.admin_id
         WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`
      )
      .get(tokenHash) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      admin: {
        id: Number(sessionRow.id),
        email: String(sessionRow.email),
        name: String(sessionRow.name),
        role: String(sessionRow.role),
        last_login_at: sessionRow.last_login_at ? String(sessionRow.last_login_at) : null,
      },
      csrfToken: String(sessionRow.csrf_token),
    });
  });

  app.post('/api/auth/logout', requireAdmin, (req: AuthenticatedRequest, res) => {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (rawToken) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256Hex(rawToken));
    }
    if (req.adminSession) {
      logActivity(
        db,
        req.adminSession.email,
        'LOGOUT',
        'Administrator signed out',
        'SUCCESS',
        getClientIp(req)
      );
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  // ==================== PROTECTED ADMIN ROUTES ====================

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const totalPublished = (
      db.prepare("SELECT COUNT(*) as c FROM ai_listings WHERE status = 'published'").get() as { c: number }
    ).c;
    const totalDrafts = (
      db.prepare("SELECT COUNT(*) as c FROM ai_listings WHERE status = 'draft'").get() as { c: number }
    ).c;
    const featuredCount = (
      db.prepare("SELECT COUNT(*) as c FROM ai_listings WHERE status = 'published' AND is_featured = 1").get() as { c: number }
    ).c;
    const totalCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
    const totalVisits = (
      db.prepare('SELECT COALESCE(SUM(visit_count), 0) as s FROM ai_listings').get() as { s: number }
    ).s;
    const totalContacts = (db.prepare('SELECT COUNT(*) as c FROM contact_messages').get() as { c: number }).c;
    const unreadContacts = (
      db.prepare('SELECT COUNT(*) as c FROM contact_messages WHERE is_read = 0').get() as { c: number }
    ).c;

    const recentLogs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 12').all();

    res.json({
      stats: {
        totalPublished,
        totalDrafts,
        featuredCount,
        totalCategories,
        totalVisits,
        totalContacts,
        unreadContacts,
      },
      recentLogs,
    });
  });

  // Safe raster image upload (PNG/JPEG/WEBP validated via magic bytes, max 2MB)
  app.post('/api/admin/upload', requireAdmin, (req: AuthenticatedRequest, res) => {
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      return res.status(400).json({ error: 'Only PNG, JPEG, or WEBP image uploads are supported.' });
    }

    const mimeSubtype = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must be under 2 MB.' });
    }

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp =
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (
      (mimeSubtype === 'png' && !isPng) ||
      (mimeSubtype === 'jpeg' && !isJpeg) ||
      (mimeSubtype === 'webp' && !isWebp)
    ) {
      return res.status(400).json({ error: 'Uploaded file signature does not match image type.' });
    }

    const ext = mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype;
    const filename = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    const url = `/uploads/${filename}`;
    logActivity(
      db,
      req.adminSession!.email,
      'IMAGE_UPLOADED',
      `Uploaded media asset ${filename}`,
      'SUCCESS',
      getClientIp(req)
    );
    res.status(201).json({ url });
  });

  // Admin AI Listings Publishing & CRUD
  app.get('/api/admin/listings', requireAdmin, (_req, res) => {
    const rows = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l
         LEFT JOIN categories c ON c.id = l.category_id
         ORDER BY l.id DESC`
      )
      .all() as Array<Record<string, unknown>>;
    res.json({ listings: rows.map(mapListingRow) });
  });

  app.post('/api/admin/listings', requireAdmin, (req: AuthenticatedRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const logoUrl = typeof req.body?.logo_url === 'string' ? req.body.logo_url.trim() : '';
    const shortDescription =
      typeof req.body?.short_description === 'string' ? req.body.short_description.trim() : '';
    const fullDescription =
      typeof req.body?.full_description === 'string' ? req.body.full_description.trim() : '';
    const websiteUrl = typeof req.body?.website_url === 'string' ? req.body.website_url.trim() : '';
    const creatorName = typeof req.body?.creator_name === 'string' ? req.body.creator_name.trim() : '';
    const categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
    const status = req.body?.status === 'draft' ? 'draft' : 'published';
    const isFeatured = Boolean(req.body?.is_featured);
    const isExample = Boolean(req.body?.is_example);

    const features = Array.isArray(req.body?.features)
      ? req.body.features.map((f: unknown) => String(f).trim()).filter(Boolean)
      : [];
    const screenshots = Array.isArray(req.body?.screenshots)
      ? req.body.screenshots
          .map((s: unknown) => String(s).trim())
          .filter((s: string) => s && isSafeUrlOrPath(s))
      : [];
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    if (!name || !shortDescription || !fullDescription || !websiteUrl) {
      return res
        .status(400)
        .json({ error: 'Name, short description, full description, and external website URL are required.' });
    }
    if (!isSafeExternalUrl(websiteUrl)) {
      return res.status(400).json({ error: 'External website URL must start with https:// or http://.' });
    }
    if (!isSafeUrlOrPath(logoUrl)) {
      return res.status(400).json({ error: 'Invalid logo URL.' });
    }

    const baseSlug = slugify(typeof req.body?.slug === 'string' && req.body.slug ? req.body.slug : name);
    if (!baseSlug) {
      return res.status(400).json({ error: 'Invalid listing slug.' });
    }
    const exists = db.prepare('SELECT id FROM ai_listings WHERE lower(slug) = ?').get(baseSlug);
    const finalSlug = exists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    const info = db
      .prepare(
        `INSERT INTO ai_listings (
          slug, name, logo_url, short_description, full_description,
          features_json, screenshots_json, website_url, category_id,
          tags_json, creator_name, status, is_featured, is_example, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        finalSlug,
        name,
        logoUrl,
        shortDescription,
        fullDescription,
        JSON.stringify(features),
        JSON.stringify(screenshots),
        websiteUrl,
        categoryId,
        JSON.stringify(tags),
        creatorName,
        status,
        isFeatured ? 1 : 0,
        isExample ? 1 : 0,
        status === 'published' ? new Date().toISOString() : null
      );

    logActivity(
      db,
      req.adminSession!.email,
      status === 'published' ? 'LISTING_PUBLISHED' : 'LISTING_DRAFT_SAVED',
      `${status === 'published' ? 'Published' : 'Saved draft'} listing ${name} (${finalSlug})`,
      'SUCCESS',
      getClientIp(req)
    );

    const created = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l LEFT JOIN categories c ON c.id = l.category_id WHERE l.id = ?`
      )
      .get(info.lastInsertRowid) as Record<string, unknown>;

    res.status(201).json({ listing: mapListingRow(created) });
  });

  app.put('/api/admin/listings/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM ai_listings WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'AI listing not found.' });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : String(existing.name);
    const logoUrl =
      typeof req.body?.logo_url === 'string' ? req.body.logo_url.trim() : String(existing.logo_url);
    const shortDescription =
      typeof req.body?.short_description === 'string'
        ? req.body.short_description.trim()
        : String(existing.short_description);
    const fullDescription =
      typeof req.body?.full_description === 'string'
        ? req.body.full_description.trim()
        : String(existing.full_description);
    const websiteUrl =
      typeof req.body?.website_url === 'string'
        ? req.body.website_url.trim()
        : String(existing.website_url);
    const creatorName =
      typeof req.body?.creator_name === 'string'
        ? req.body.creator_name.trim()
        : String(existing.creator_name);
    const categoryId =
      req.body?.category_id === null
        ? null
        : req.body?.category_id !== undefined
        ? Number(req.body.category_id)
        : existing.category_id;

    const status =
      req.body?.status === 'draft' || req.body?.status === 'published'
        ? req.body.status
        : String(existing.status);
    const isFeatured =
      req.body?.is_featured !== undefined ? (req.body.is_featured ? 1 : 0) : Number(existing.is_featured);
    const isExample =
      req.body?.is_example !== undefined ? (req.body.is_example ? 1 : 0) : Number(existing.is_example);

    const featuresJson = Array.isArray(req.body?.features)
      ? JSON.stringify(req.body.features.map((f: unknown) => String(f).trim()).filter(Boolean))
      : String(existing.features_json);
    const screenshotsJson = Array.isArray(req.body?.screenshots)
      ? JSON.stringify(
          req.body.screenshots
            .map((s: unknown) => String(s).trim())
            .filter((s: string) => s && isSafeUrlOrPath(s))
        )
      : String(existing.screenshots_json);
    const tagsJson = Array.isArray(req.body?.tags)
      ? JSON.stringify(req.body.tags.map((t: unknown) => String(t).trim()).filter(Boolean))
      : String(existing.tags_json);

    if (!name || !shortDescription || !fullDescription || !websiteUrl) {
      return res.status(400).json({ error: 'Required listing fields cannot be empty.' });
    }
    if (!isSafeExternalUrl(websiteUrl)) {
      return res.status(400).json({ error: 'External website URL must start with https:// or http://.' });
    }
    if (!isSafeUrlOrPath(logoUrl)) {
      return res.status(400).json({ error: 'Invalid logo URL.' });
    }

    const publishedAt =
      status === 'published'
        ? existing.published_at || new Date().toISOString()
        : existing.published_at;

    db.prepare(
      `UPDATE ai_listings SET
        name = ?, logo_url = ?, short_description = ?, full_description = ?,
        features_json = ?, screenshots_json = ?, website_url = ?, category_id = ?,
        tags_json = ?, creator_name = ?, status = ?, is_featured = ?, is_example = ?,
        published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name,
      logoUrl,
      shortDescription,
      fullDescription,
      featuresJson,
      screenshotsJson,
      websiteUrl,
      categoryId,
      tagsJson,
      creatorName,
      status,
      isFeatured,
      isExample,
      publishedAt,
      id
    );

    logActivity(
      db,
      req.adminSession!.email,
      'LISTING_UPDATED',
      `Updated listing ${name} (#${id}, status: ${status})`,
      'SUCCESS',
      getClientIp(req)
    );

    const updated = db
      .prepare(
        `SELECT l.*, c.name as category_name, c.slug as category_slug
         FROM ai_listings l LEFT JOIN categories c ON c.id = l.category_id WHERE l.id = ?`
      )
      .get(id) as Record<string, unknown>;

    res.json({ listing: mapListingRow(updated) });
  });

  app.delete('/api/admin/listings/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT name FROM ai_listings WHERE id = ?').get(id) as
      | { name: string }
      | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'AI listing not found.' });
    }
    db.prepare('DELETE FROM ai_listings WHERE id = ?').run(id);
    logActivity(
      db,
      req.adminSession!.email,
      'LISTING_DELETED',
      `Deleted listing ${existing.name} (#${id})`,
      'SUCCESS',
      getClientIp(req)
    );
    res.json({ deleted: true });
  });

  // Admin Categories CRUD
  app.get('/api/admin/categories', requireAdmin, (_req, res) => {
    res.json({ categories: getCategoriesWithCounts(db) });
  });

  app.post('/api/admin/categories', requireAdmin, (req: AuthenticatedRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Category name is required (max 80 chars).' });
    }
    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'Invalid category name.' });
    }
    const dup = db.prepare('SELECT id FROM categories WHERE lower(slug) = ?').get(slug);
    if (dup) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM categories').get() as { m: number }).m;
    const info = db
      .prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)')
      .run(name, slug, description, maxOrder + 1);

    logActivity(
      db,
      req.adminSession!.email,
      'CATEGORY_CREATED',
      `Created category ${name}`,
      'SUCCESS',
      getClientIp(req)
    );
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ category: created });
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : String(existing.name);
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : String(existing.description);
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const slug = slugify(name);
    const dup = db.prepare('SELECT id FROM categories WHERE lower(slug) = ? AND id != ?').get(slug, id);
    if (dup) {
      return res.status(409).json({ error: 'Another category uses this name.' });
    }
    db.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?').run(
      name,
      slug,
      description,
      id
    );
    logActivity(
      db,
      req.adminSession!.email,
      'CATEGORY_UPDATED',
      `Updated category ${name} (#${id})`,
      'SUCCESS',
      getClientIp(req)
    );
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ category: updated });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT name FROM categories WHERE id = ?').get(id) as
      | { name: string }
      | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    logActivity(
      db,
      req.adminSession!.email,
      'CATEGORY_DELETED',
      `Deleted category ${existing.name} (#${id})`,
      'SUCCESS',
      getClientIp(req)
    );
    res.json({ deleted: true });
  });

  // Admin FAQs CRUD
  app.get('/api/admin/faqs', requireAdmin, (_req, res) => {
    res.json({ faqs: getFaqs(db) });
  });

  app.post('/api/admin/faqs', requireAdmin, (req: AuthenticatedRequest, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM faqs').get() as { m: number }).m;
    const info = db
      .prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)')
      .run(question, answer, maxOrder + 1);
    logActivity(
      db,
      req.adminSession!.email,
      'FAQ_CREATED',
      `Added FAQ: ${question.slice(0, 60)}`,
      'SUCCESS',
      getClientIp(req)
    );
    const created = db.prepare('SELECT * FROM faqs WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ faq: created });
  });

  app.put('/api/admin/faqs/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }
    const result = db.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(question, answer, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }
    logActivity(
      db,
      req.adminSession!.email,
      'FAQ_UPDATED',
      `Updated FAQ #${id}`,
      'SUCCESS',
      getClientIp(req)
    );
    const updated = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id);
    res.json({ faq: updated });
  });

  app.delete('/api/admin/faqs/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }
    logActivity(db, req.adminSession!.email, 'FAQ_DELETED', `Deleted FAQ #${id}`, 'SUCCESS', getClientIp(req));
    res.json({ deleted: true });
  });

  // Admin Homepage Content
  app.put('/api/admin/homepage', requireAdmin, (req: AuthenticatedRequest, res) => {
    const heroHeading = typeof req.body?.hero_heading === 'string' ? req.body.hero_heading.trim() : '';
    const heroSubtitle = typeof req.body?.hero_subtitle === 'string' ? req.body.hero_subtitle.trim() : '';
    const heroCtaLabel =
      typeof req.body?.hero_cta_label === 'string' ? req.body.hero_cta_label.trim() : 'Explore AI Assistants';
    const heroImageUrl = typeof req.body?.hero_image_url === 'string' ? req.body.hero_image_url.trim() : '';
    const aboutHeading = typeof req.body?.about_heading === 'string' ? req.body.about_heading.trim() : '';
    const aboutBody = typeof req.body?.about_body === 'string' ? req.body.about_body.trim() : '';

    if (!heroHeading || !heroSubtitle || !aboutHeading || !aboutBody) {
      return res.status(400).json({ error: 'Hero and About fields cannot be empty.' });
    }
    if (!isSafeUrlOrPath(heroImageUrl)) {
      return res.status(400).json({ error: 'Invalid hero image URL.' });
    }

    db.prepare(
      `UPDATE homepage_content SET
        hero_heading = ?, hero_subtitle = ?, hero_cta_label = ?, hero_image_url = ?,
        about_heading = ?, about_body = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(heroHeading, heroSubtitle, heroCtaLabel, heroImageUrl, aboutHeading, aboutBody);

    logActivity(
      db,
      req.adminSession!.email,
      'HOMEPAGE_UPDATED',
      'Updated homepage sections',
      'SUCCESS',
      getClientIp(req)
    );

    res.json({ homepage: getHomepageContent(db) });
  });

  // Admin Contact Messages
  app.get('/api/admin/contacts', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all() as Array<
      Record<string, unknown>
    >;
    res.json({
      messages: rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        email: String(r.email),
        subject: String(r.subject),
        message: String(r.message),
        is_read: Boolean(r.is_read),
        created_at: String(r.created_at),
      })),
    });
  });

  app.patch('/api/admin/contacts/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const isRead = Boolean(req.body?.is_read);
    const result = db.prepare('UPDATE contact_messages SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    logActivity(
      db,
      req.adminSession!.email,
      'CONTACT_STATUS_UPDATED',
      `Marked contact message #${id} as ${isRead ? 'read' : 'unread'}`,
      'SUCCESS',
      getClientIp(req)
    );
    res.json({ ok: true, is_read: isRead });
  });

  app.delete('/api/admin/contacts/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    logActivity(
      db,
      req.adminSession!.email,
      'CONTACT_DELETED',
      `Deleted contact message #${id}`,
      'SUCCESS',
      getClientIp(req)
    );
    res.json({ deleted: true });
  });

  // Admin Website Settings
  app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res) => {
    const siteName = typeof req.body?.site_name === 'string' ? req.body.site_name.trim() : '';
    const tagline = typeof req.body?.tagline === 'string' ? req.body.tagline.trim() : '';
    const logoUrl = typeof req.body?.logo_url === 'string' ? req.body.logo_url.trim() : '';
    const faviconUrl = typeof req.body?.favicon_url === 'string' ? req.body.favicon_url.trim() : '/favicon.svg';
    const contactEmail = typeof req.body?.contact_email === 'string' ? req.body.contact_email.trim() : '';
    const contactPhone = typeof req.body?.contact_phone === 'string' ? req.body.contact_phone.trim() : '';
    const contactLocation = typeof req.body?.contact_location === 'string' ? req.body.contact_location.trim() : '';
    const announcementText = typeof req.body?.announcement_text === 'string' ? req.body.announcement_text.trim() : '';
    const announcementEnabled = Boolean(req.body?.announcement_enabled);
    const socialLinks =
      req.body?.social_links && typeof req.body.social_links === 'object' ? req.body.social_links : {};

    if (!siteName || !tagline) {
      return res.status(400).json({ error: 'Website name and tagline are required.' });
    }
    if (!isSafeUrlOrPath(logoUrl) || !isSafeUrlOrPath(faviconUrl)) {
      return res.status(400).json({ error: 'Invalid logo or favicon URL.' });
    }

    const sanitizedSocial: Record<string, string> = {};
    for (const key of ['twitter', 'linkedin', 'github', 'youtube', 'discord', 'website']) {
      const val = typeof socialLinks[key] === 'string' ? socialLinks[key].trim() : '';
      if (val && isSafeUrlOrPath(val)) {
        sanitizedSocial[key] = val;
      }
    }

    db.prepare(
      `UPDATE site_settings SET
        site_name = ?, tagline = ?, logo_url = ?, favicon_url = ?,
        contact_email = ?, contact_phone = ?, contact_location = ?,
        announcement_text = ?, announcement_enabled = ?, social_links_json = ?,
        updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      siteName,
      tagline,
      logoUrl,
      faviconUrl || '/favicon.svg',
      contactEmail,
      contactPhone,
      contactLocation,
      announcementText,
      announcementEnabled ? 1 : 0,
      JSON.stringify(sanitizedSocial)
    );

    logActivity(
      db,
      req.adminSession!.email,
      'SETTINGS_UPDATED',
      'Updated website branding, announcements, and social links',
      'SUCCESS',
      getClientIp(req)
    );

    res.json({ settings: getSiteSettings(db) });
  });

  // Admin Profile & Password Change
  app.put('/api/admin/profile', requireAdmin, (req: AuthenticatedRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Display name must be between 2 and 80 characters.' });
    }
    db.prepare(`UPDATE admins SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name,
      req.adminSession!.adminId
    );
    logActivity(
      db,
      req.adminSession!.email,
      'PROFILE_UPDATED',
      `Updated administrator name to ${name}`,
      'SUCCESS',
      getClientIp(req)
    );
    res.json({
      admin: {
        id: req.adminSession!.adminId,
        email: req.adminSession!.email,
        name,
        role: req.adminSession!.role,
        last_login_at: req.adminSession!.lastLoginAt,
      },
    });
  });

  app.post('/api/admin/change-password', requireAdmin, (req: AuthenticatedRequest, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must differ from current password.' });
    }

    const adminRow = db
      .prepare('SELECT password_hash FROM admins WHERE id = ?')
      .get(req.adminSession!.adminId) as { password_hash: string } | undefined;

    if (!adminRow || !verifyPassword(currentPassword, adminRow.password_hash)) {
      logActivity(
        db,
        req.adminSession!.email,
        'PASSWORD_CHANGE_FAILED',
        'Incorrect current password supplied during password change',
        'FAILED',
        getClientIp(req)
      );
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare(`UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
      newHash,
      req.adminSession!.adminId
    );

    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND id != ?').run(
      req.adminSession!.adminId,
      req.adminSession!.sessionId
    );

    logActivity(
      db,
      req.adminSession!.email,
      'PASSWORD_CHANGED',
      'Administrator password updated successfully',
      'SUCCESS',
      getClientIp(req)
    );

    res.json({ ok: true, message: 'Password updated successfully.' });
  });

  app.get('/api/admin/logs', requireAdmin, (req, res) => {
    const limit = Math.min(200, Math.max(10, Number(req.query.limit || 100)));
    const rows = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?').all(limit);
    res.json({ logs: rows });
  });

  // ==================== VITE / STATIC FRONTEND SERVING ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXORA AI Directory server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NEXORA AI server:', err);
  process.exit(1);
});
