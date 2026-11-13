import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronDown, LayoutGrid, Search } from 'lucide-react';
import type { AiListing, Category, FaqItem, HomepageContent, SiteSettings } from '../types';
import { DEFAULT_HERO_IMAGE } from '../assets/imageRegistry';
import { SafeImage } from '../components/BrandMark';
import { ListingCard } from '../components/ListingCard';
import { api } from '../lib/api';

interface HomePageProps {
  homepage: HomepageContent;
  settings: SiteSettings;
  categories: Category[];
  faqs: FaqItem[];
  listings: AiListing[];
  onNavigate: (path: string) => void;
  onVisitRecorded: (slug: string, newCount: number) => void;
}

export function HomePage({
  homepage,
  settings,
  categories,
  faqs,
  listings,
  onNavigate,
  onVisitRecorded,
}: HomePageProps) {
  const [heroSearch, setHeroSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState<{
    type: 'idle' | 'submitting' | 'success' | 'error';
    text?: string;
  }>({ type: 'idle' });

  const featuredListings = listings.filter((l) => l.is_featured).slice(0, 6);
  const recentListings = [...listings]
    .sort(
      (a, b) =>
        Date.parse(b.published_at || b.created_at) - Date.parse(a.published_at || a.created_at) ||
        b.id - a.id
    )
    .slice(0, 6);
  const popularListings = [...listings]
    .sort((a, b) => b.visit_count - a.visit_count || b.id - a.id)
    .slice(0, 3);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    onNavigate(q ? `/directory?q=${encodeURIComponent(q)}` : '/directory');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus({ type: 'submitting' });
    try {
      const res = await api.submitContact(contactForm);
      setContactStatus({ type: 'success', text: res.message });
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setContactStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    }
  };

  return (
    <div className="bg-[#06070A]">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="absolute inset-0 pointer-events-none">
          <SafeImage
            src={homepage.hero_image_url || DEFAULT_HERO_IMAGE}
            alt="NEXORA AI Directory Observatory"
            className="w-full h-full object-cover opacity-38"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06070A]/80 via-[#06070A]/75 to-[#06070A]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(212,175,55,0.15),transparent_55%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-6"
          >
            <p className="text-sm font-medium text-[#F1D279] tracking-wide">
              {settings.site_name} · {settings.tagline}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              {homepage.hero_heading || 'Discover the Universe of AI'}
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl">
              {homepage.hero_subtitle || 'Explore, discover and access powerful AI assistants.'}
            </p>

            {/* Hero Search Bar */}
            <form
              onSubmit={handleHeroSearch}
              className="flex flex-col sm:flex-row gap-3 pt-2 max-w-2xl"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search AI assistants, tags, or creators..."
                  aria-label="Search AI assistants"
                  className="w-full h-12 pl-10 pr-4 rounded-lg glass-surface text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <button
                type="submit"
                className="h-12 inline-flex items-center justify-center gap-2 px-6 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{homepage.hero_cta_label || 'Explore AI Assistants'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* 2. FEATURED AI SECTION */}
      {featuredListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div className="space-y-1.5">
              <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                Featured AI Assistants
              </h2>
              <p className="text-sm text-zinc-400">
                Highlighted AI platforms curated by the NEXORA directory team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/directory?featured=true')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F1D279] hover:text-white transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <span>View Featured</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onViewDetails={(slug) => onNavigate(`/ai/${slug}`)}
                onVisitRecorded={onVisitRecorded}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. RECENTLY PUBLISHED AI SECTION */}
      <section className="border-t border-white/[0.08] bg-[#080A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div className="space-y-1.5">
              <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                Recently Published AI
              </h2>
              <p className="text-sm text-zinc-400">
                Newest external AI assistants added to the directory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/directory')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#60A5FA] hover:text-white transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <span>Browse Full Directory</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentListings.length === 0 ? (
            <div className="glass-surface rounded-xl p-10 text-center text-zinc-400">
              No AI listings have been published yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onViewDetails={(slug) => onNavigate(`/ai/${slug}`)}
                  onVisitRecorded={onVisitRecorded}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. POPULAR AI SECTION */}
      {popularListings.length > 0 && (
        <section className="border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
              <div className="space-y-1.5">
                <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                  Popular AI Tools
                </h2>
                <p className="text-sm text-zinc-400">
                  Most visited external AI assistants across the NEXORA directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/directory?sort=popular')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F1D279] hover:text-white transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <span>See Most Visited</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onViewDetails={(slug) => onNavigate(`/ai/${slug}`)}
                  onVisitRecorded={onVisitRecorded}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. CATEGORIES SECTION */}
      <section className="border-y border-white/[0.08] bg-[#080A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex items-center gap-3 mb-9">
            <LayoutGrid className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                Browse by Category
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Explore AI tools organized across specialized domains.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onNavigate(`/directory?category=${encodeURIComponent(cat.slug)}`)}
                className="glass-surface rounded-xl p-4 text-left hover:border-[#D4AF37]/45 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="font-display text-base font-semibold text-white">
                    {cat.name}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="font-mono text-xs text-[#F1D279] tabular-nums">
                  {cat.listing_count ?? 0} listing(s)
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ABOUT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight">
            {homepage.about_heading}
          </h2>
          <p className="text-base text-zinc-300 leading-relaxed">{homepage.about_body}</p>
          <button
            type="button"
            onClick={() => onNavigate('/about')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#60A5FA] hover:text-white transition-colors"
          >
            <span>Learn More About NEXORA AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:col-span-5 glass-surface-gold rounded-xl p-6 grid grid-cols-2 gap-6">
          <div>
            <div className="font-display text-3xl font-bold text-[#F1D279] tabular-nums">
              {listings.length}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Published AI listings</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-white tabular-nums">
              {categories.length}
            </div>
            <div className="text-xs text-zinc-400 mt-1">Curated AI categories</div>
          </div>
        </div>
      </section>

      {/* 7. FAQ + CONTACT SECTION */}
      <section className="border-t border-white/[0.08] bg-[#080A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* FAQ */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-white tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  How NEXORA AI organizes and links external AI tools.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/faq')}
                className="text-sm font-medium text-[#60A5FA] hover:text-white whitespace-nowrap"
              >
                All FAQs
              </button>
            </div>

            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {faqs.slice(0, 4).map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={item.id} className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 text-left py-1"
                    >
                      <span className="font-display text-base font-medium text-white">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-[#D4AF37]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed pr-6">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-6 glass-surface rounded-xl p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-white tracking-tight">
                Contact NEXORA AI
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Suggest an AI tool, report a broken link, or reach the directory administrator.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="home-name" className="block text-xs text-zinc-300 mb-1.5">
                    Name
                  </label>
                  <input
                    id="home-name"
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label htmlFor="home-email" className="block text-xs text-zinc-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="home-email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="home-subject" className="block text-xs text-zinc-300 mb-1.5">
                  Subject
                </label>
                <input
                  id="home-subject"
                  type="text"
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="Tool suggestion or inquiry"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label htmlFor="home-message" className="block text-xs text-zinc-300 mb-1.5">
                  Message
                </label>
                <textarea
                  id="home-message"
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Share details or external AI URL..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {contactStatus.type === 'success' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
                  {contactStatus.text}
                </div>
              )}
              {contactStatus.type === 'error' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                  {contactStatus.text}
                </div>
              )}

              <button
                type="submit"
                disabled={contactStatus.type === 'submitting'}
                className="w-full py-3 px-5 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm hover:bg-[#E5C158] transition-colors disabled:opacity-60"
              >
                {contactStatus.type === 'submitting' ? 'Sending Message...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
