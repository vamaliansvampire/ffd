import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { hashPassword } from './auth.ts';
import type {
  AiListing,
  Category,
  FaqItem,
  HomepageContent,
  SiteSettings,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nexora.db');
const MIGRATION_PATH = path.resolve(process.cwd(), 'migrations', '0001_initial.sql');

export const INITIAL_ADMIN_EMAIL = 'fawazahmad1949@gmail.com';
const INITIAL_ADMIN_PASSWORD = process.env.NEXORA_INITIAL_ADMIN_PASSWORD || 'admin.admin';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  db.exec(schemaSql);

  seedDatabase(db);
  dbInstance = db;
  return db;
}

function seedDatabase(db: Database.Database) {
  // 1. Seed single authorized initial administrator account
  const existingAdmin = db
    .prepare('SELECT id FROM admins WHERE lower(email) = lower(?)')
    .get(INITIAL_ADMIN_EMAIL);

  if (!existingAdmin) {
    const passwordHash = hashPassword(INITIAL_ADMIN_PASSWORD);
    db.prepare(
      `INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)`
    ).run(INITIAL_ADMIN_EMAIL, 'Fawaz Ahmad', passwordHash, 'super_admin');
  }

  // 2. Seed all 10 required Directory Categories
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (catCount === 0) {
    const insertCat = db.prepare(
      `INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)`
    );
    const seedCategories = [
      ['Productivity', 'productivity', 'Task planners, workflow automation, and daily efficiency assistants.', 1],
      ['Education', 'education', 'Study companions, tutoring platforms, and interactive learning tools.', 2],
      ['Coding', 'coding', 'Code generation, debugging, architecture review, and developer copilots.', 3],
      ['Image Generation', 'image-generation', 'Visual design, concept art, and photorealistic image synthesis.', 4],
      ['Writing', 'writing', 'Editorial drafting, copywriting, proofreading, and content structure.', 5],
      ['Research', 'research', 'Academic synthesis, citation discovery, and deep knowledge analysis.', 6],
      ['Business', 'business', 'Executive strategy, financial modeling, and enterprise operations.', 7],
      ['Entertainment', 'entertainment', 'Storytelling, music creation, gaming companions, and interactive media.', 8],
      ['Voice Assistants', 'voice-assistants', 'Spoken interaction, speech synthesis, and audio transcription tools.', 9],
      ['Other AI Tools', 'other-ai-tools', 'Specialized utilities and emerging multi-domain AI platforms.', 10],
    ] as const;

    for (const [name, slug, desc, order] of seedCategories) {
      insertCat.run(name, slug, desc, order);
    }
  }

  // 3. Seed clearly-marked Example Directory Listings (until admin publishes real listings)
  const listingCount = (db.prepare('SELECT COUNT(*) as c FROM ai_listings').get() as { c: number }).c;
  if (listingCount === 0) {
    const cats = db.prepare('SELECT id, slug FROM categories').all() as Array<{ id: number; slug: string }>;
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

    const insertListing = db.prepare(
      `INSERT INTO ai_listings (
        slug, name, logo_url, short_description, full_description,
        features_json, screenshots_json, website_url, category_id,
        tags_json, creator_name, status, is_featured, is_example, visit_count, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 1, ?, datetime('now', ?))`
    );

    insertListing.run(
      'nova-example',
      'NOVA',
      '/src/assets/images/assistant_nova_1794581026837.jpg',
      'Example directory listing showcasing an expressive conversational and writing assistant.',
      'This is an example directory listing demonstrating how conversational AI assistants are presented on NEXORA AI. Replace, edit, or unpublish this entry from the Admin Dashboard once you publish real external AI tools.',
      JSON.stringify([
        'Conversational drafting & tone adaptation',
        'Structured brainstorming workflows',
        'Multi-format writing assistance',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_nova_1794581026837.jpg']),
      'https://example.com/nova-ai',
      catBySlug.get('writing') ?? null,
      JSON.stringify(['Writing', 'Conversation', 'Example']),
      'NEXORA Directory Sample',
      1,
      42,
      '-1 days'
    );

    insertListing.run(
      'orion-example',
      'ORION',
      '/src/assets/images/assistant_orion_1794581026684.jpg',
      'Example directory listing for an executive strategy and business intelligence tool.',
      'This is an example listing illustrating how B2B and executive strategy AI platforms appear in the NEXORA directory. Administrators can update the external URL, logo, screenshots, and description at any time.',
      JSON.stringify([
        'Executive brief & memo structuring',
        'Strategic SWOT & market matrices',
        'Quarterly planning frameworks',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_orion_1794581026684.jpg']),
      'https://example.com/orion-ai',
      catBySlug.get('business') ?? null,
      JSON.stringify(['Business', 'Strategy', 'Example']),
      'NEXORA Directory Sample',
      1,
      38,
      '-2 days'
    );

    insertListing.run(
      'titan-example',
      'TITAN',
      '/src/assets/images/assistant_titan_1794581026786.jpg',
      'Example directory listing for a developer workflow and coding productivity platform.',
      'This example directory entry demonstrates how coding and productivity AI tools are categorized, tagged, and linked to external websites on NEXORA AI.',
      JSON.stringify([
        'Sprint planning & task breakdown',
        'Code review checklists',
        'Workflow automation templates',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_titan_1794581026786.jpg']),
      'https://example.com/titan-ai',
      catBySlug.get('coding') ?? null,
      JSON.stringify(['Coding', 'Productivity', 'Example']),
      'NEXORA Directory Sample',
      1,
      31,
      '-3 days'
    );

    insertListing.run(
      'aura-example',
      'AURA',
      '/src/assets/images/assistant_aura_1794581027669.jpg',
      'Example directory listing for a personal productivity and educational study assistant.',
      'This example entry demonstrates an education and everyday productivity AI tool profile, complete with category assignment, tags, creator attribution, and external launch link.',
      JSON.stringify([
        'Daily routine & habit organization',
        'Plain-language study summaries',
        'Guided learning prompts',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_aura_1794581027669.jpg']),
      'https://example.com/aura-ai',
      catBySlug.get('education') ?? null,
      JSON.stringify(['Education', 'Productivity', 'Example']),
      'NEXORA Directory Sample',
      0,
      24,
      '-4 days'
    );

    insertListing.run(
      'echo-example',
      'ECHO',
      '/src/assets/images/assistant_echo_1794581028210.jpg',
      'Example directory listing for a voice synthesis and acoustic assistant platform.',
      'This example directory listing represents how third-party voice assistant and audio AI platforms are cataloged in NEXORA AI with direct links to their official websites.',
      JSON.stringify([
        'Voice synthesis & dubbing workflows',
        'Podcast & audio cleanup indexing',
        'Real-time transcription support',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_echo_1794581028210.jpg']),
      'https://example.com/echo-ai',
      catBySlug.get('voice-assistants') ?? null,
      JSON.stringify(['Voice', 'Audio', 'Example']),
      'NEXORA Directory Sample',
      0,
      19,
      '-5 days'
    );

    insertListing.run(
      'atlas-example',
      'ATLAS',
      '/src/assets/images/assistant_atlas_1794581028523.jpg',
      'Example directory listing for an academic research and knowledge discovery engine.',
      'This example listing showcases a research and synthesis tool profile on NEXORA AI. Use the Admin Dashboard to publish your own curated AI tools with real external URLs.',
      JSON.stringify([
        'Literature synthesis & citation mapping',
        'Concept comparison tables',
        'Structured research outlines',
        'Example listing ready for replacement',
      ]),
      JSON.stringify(['/src/assets/images/assistant_atlas_1794581028523.jpg']),
      'https://example.com/atlas-ai',
      catBySlug.get('research') ?? null,
      JSON.stringify(['Research', 'Knowledge', 'Example']),
      'NEXORA Directory Sample',
      0,
      27,
      '-6 days'
    );
  }

  // 4. Seed Homepage Content
  const homeExists = db.prepare('SELECT id FROM homepage_content WHERE id = 1').get();
  if (!homeExists) {
    db.prepare(
      `INSERT INTO homepage_content (
        id, hero_heading, hero_subtitle, hero_cta_label, hero_image_url,
        about_heading, about_body
      ) VALUES (1, ?, ?, ?, ?, ?, ?)`
    ).run(
      'Discover the Universe of AI',
      'Explore, discover and access powerful AI assistants.',
      'Explore AI Assistants',
      '/src/assets/images/hero_nexora_universe_1794581026278.jpg',
      'Curated Discovery for External AI Assistants',
      'NEXORA AI is an independent directory and publishing platform built to organize, showcase, and connect visitors with specialized AI assistants created across the industry. Every listing links directly to its official external website with verified category taxonomy, screenshots, and usage highlights.'
    );
  }

  // 5. Seed Website Settings
  const settingsExists = db.prepare('SELECT id FROM site_settings WHERE id = 1').get();
  if (!settingsExists) {
    db.prepare(
      `INSERT INTO site_settings (
        id, site_name, tagline, logo_url, favicon_url, contact_email,
        contact_phone, contact_location, announcement_text, announcement_enabled, social_links_json
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'NEXORA AI',
      'The Universe of AI Assistants',
      '',
      '/favicon.svg',
      'directory@nexora-ai.platform',
      '+1 (415) 555-0194',
      'San Francisco · Global Directory',
      '',
      0,
      JSON.stringify({
        twitter: 'https://x.com',
        linkedin: 'https://linkedin.com',
        github: 'https://github.com',
        youtube: 'https://youtube.com',
      })
    );
  }

  // 6. Seed FAQs
  const faqCount = (db.prepare('SELECT COUNT(*) as c FROM faqs').get() as { c: number }).c;
  if (faqCount === 0) {
    const insertFaq = db.prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)');
    insertFaq.run(
      'What is NEXORA AI?',
      'NEXORA AI is a curated directory and publishing platform for discovering AI assistants created by teams and builders around the world. Rather than hosting a chatbot itself, NEXORA organizes listings by category and connects you directly to each tool’s official website.',
      1
    );
    insertFaq.run(
      'How do I open and use an AI assistant listed here?',
      'Click Details on any card to review its features, screenshots, tags, and creator attribution, or click Visit AI to open the assistant’s external website directly in a new browser tab.',
      2
    );
    insertFaq.run(
      'Why are some initial listings marked as Example Listings?',
      'Sample entries are clearly marked as Example Listings so visitors and administrators can preview the directory layout immediately. The platform administrator can edit, unpublish, or replace them with real external AI listings from the Admin Dashboard.',
      3
    );
    insertFaq.run(
      'Who can publish or edit AI assistant listings?',
      'Only the authorized platform administrator can publish, save drafts, upload logos and screenshots, manage categories, or feature listings through the protected Admin Dashboard.',
      4
    );
  }
}

export function mapListingRow(row: Record<string, unknown>): AiListing {
  const parseArr = (raw: unknown): string[] => {
    try {
      const parsed = JSON.parse(String(raw || '[]'));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    logo_url: String(row.logo_url || ''),
    short_description: String(row.short_description),
    full_description: String(row.full_description),
    features: parseArr(row.features_json),
    screenshots: parseArr(row.screenshots_json),
    website_url: String(row.website_url),
    category_id: row.category_id !== null && row.category_id !== undefined ? Number(row.category_id) : null,
    category_name: row.category_name ? String(row.category_name) : null,
    category_slug: row.category_slug ? String(row.category_slug) : null,
    tags: parseArr(row.tags_json),
    creator_name: String(row.creator_name || ''),
    status: row.status === 'draft' ? 'draft' : 'published',
    is_featured: Boolean(row.is_featured),
    is_example: Boolean(row.is_example),
    visit_count: Number(row.visit_count || 0),
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function getHomepageContent(db: Database.Database): HomepageContent {
  const row = db.prepare('SELECT * FROM homepage_content WHERE id = 1').get() as Record<string, unknown>;
  return {
    hero_heading: String(row.hero_heading),
    hero_subtitle: String(row.hero_subtitle),
    hero_cta_label: String(row.hero_cta_label),
    hero_image_url: String(row.hero_image_url || ''),
    about_heading: String(row.about_heading),
    about_body: String(row.about_body),
    updated_at: String(row.updated_at),
  };
}

export function getSiteSettings(db: Database.Database): SiteSettings {
  const row = db.prepare('SELECT * FROM site_settings WHERE id = 1').get() as Record<string, unknown>;
  let socialLinks = {};
  try {
    socialLinks = JSON.parse(String(row.social_links_json || '{}'));
  } catch {
    socialLinks = {};
  }
  return {
    site_name: String(row.site_name),
    tagline: String(row.tagline),
    logo_url: String(row.logo_url || ''),
    favicon_url: String(row.favicon_url || '/favicon.svg'),
    contact_email: String(row.contact_email || ''),
    contact_phone: String(row.contact_phone || ''),
    contact_location: String(row.contact_location || ''),
    announcement_text: String(row.announcement_text || ''),
    announcement_enabled: Boolean(row.announcement_enabled),
    social_links: socialLinks && typeof socialLinks === 'object' ? socialLinks : {},
    updated_at: String(row.updated_at),
  };
}

export function getCategoriesWithCounts(db: Database.Database): Category[] {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(l.id) as listing_count
       FROM categories c
       LEFT JOIN ai_listings l ON l.category_id = c.id AND l.status = 'published'
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description || ''),
    sort_order: Number(r.sort_order || 0),
    listing_count: Number(r.listing_count || 0),
    created_at: String(r.created_at),
  }));
}

export function getFaqs(db: Database.Database): FaqItem[] {
  const rows = db
    .prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    question: String(r.question),
    answer: String(r.answer),
    sort_order: Number(r.sort_order || 0),
    created_at: String(r.created_at),
  }));
}

export function logActivity(
  db: Database.Database,
  adminEmail: string,
  action: string,
  details: string,
  status: 'SUCCESS' | 'FAILED' | 'LOCKED' = 'SUCCESS',
  ipAddress = ''
) {
  db.prepare(
    `INSERT INTO activity_logs (admin_email, action, details, status, ip_address)
     VALUES (?, ?, ?, ?, ?)`
  ).run(adminEmail, action, details, status, ipAddress);
}
