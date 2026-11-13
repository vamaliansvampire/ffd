export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  listing_count?: number;
  created_at: string;
}

export interface AiListing {
  id: number;
  slug: string;
  name: string;
  logo_url: string;
  short_description: string;
  full_description: string;
  features: string[];
  screenshots: string[];
  website_url: string;
  category_id: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  tags: string[];
  creator_name: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  is_example: boolean;
  visit_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomepageContent {
  hero_heading: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_image_url: string;
  about_heading: string;
  about_body: string;
  updated_at?: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  discord?: string;
  website?: string;
}

export interface SiteSettings {
  site_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  contact_email: string;
  contact_phone: string;
  contact_location: string;
  announcement_text: string;
  announcement_enabled: boolean;
  social_links: SocialLinks;
  updated_at?: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  created_at?: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  admin_email: string;
  action: string;
  details: string;
  status: string;
  ip_address: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  last_login_at: string | null;
}
