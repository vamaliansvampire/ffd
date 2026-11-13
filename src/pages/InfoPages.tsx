import { useState } from 'react';
import { ArrowRight, ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import type { Category, FaqItem, HomepageContent, SiteSettings } from '../types';
import { api } from '../lib/api';

export function AboutPage({
  homepage,
  categories,
  listingCount,
  onNavigate,
}: {
  homepage: HomepageContent;
  categories: Category[];
  listingCount: number;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-14">
      <div className="max-w-3xl space-y-5">
        <p className="text-sm font-medium text-[#F1D279]">About NEXORA AI</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
          {homepage.about_heading}
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">{homepage.about_body}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-surface rounded-xl p-6 space-y-2">
          <div className="font-display text-3xl font-bold text-[#F1D279] tabular-nums">
            {listingCount}
          </div>
          <div className="text-sm font-semibold text-white">Published Listings</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            External AI assistants indexed with descriptions, tags, screenshots, and direct launch URLs.
          </p>
        </div>

        <div className="glass-surface rounded-xl p-6 space-y-2">
          <div className="font-display text-3xl font-bold text-white tabular-nums">
            {categories.length}
          </div>
          <div className="text-sm font-semibold text-white">Curated Categories</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Organized across Productivity, Coding, Image Generation, Research, Business, and more.
          </p>
        </div>

        <div className="glass-surface rounded-xl p-6 space-y-2">
          <div className="font-display text-3xl font-bold text-[#60A5FA]">Direct Access</div>
          <div className="text-sm font-semibold text-white">External Linking</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            NEXORA AI is an independent directory—every Visit AI button opens the creator’s official website.
          </p>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onNavigate('/directory')}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm hover:bg-[#E5C158] transition-colors"
        >
          <span>Browse AI Directory</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ContactPage({ settings }: { settings: SiteSettings }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    text?: string;
  }>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading' });
    try {
      const res = await api.submitContact(form);
      setStatus({ type: 'success', text: res.message });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-5 space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#F1D279]">Contact</p>
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">Get in Touch</h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Submit AI tool suggestions, directory corrections, or general inquiries directly to the NEXORA AI administrator inbox.
          </p>
        </div>

        <div className="glass-surface rounded-xl p-6 space-y-4 text-sm text-zinc-300">
          {settings.contact_email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{settings.contact_email}</span>
            </div>
          )}
          {settings.contact_phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{settings.contact_phone}</span>
            </div>
          )}
          {settings.contact_location && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{settings.contact_location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 glass-surface rounded-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Topic of your inquiry"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Provide details (at least 10 characters)..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {status.type === 'success' && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
              {status.text}
            </div>
          )}
          {status.type === 'error' && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={status.type === 'loading'}
            className="w-full py-3 px-6 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm hover:bg-[#E5C158] transition-colors disabled:opacity-60"
          >
            {status.type === 'loading' ? 'Sending...' : 'Submit Message'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function FaqPage({
  faqs,
  onNavigate,
}: {
  faqs: FaqItem[];
  onNavigate: (path: string) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
      <div className="space-y-3">
        <p className="text-sm font-medium text-[#F1D279]">FAQ</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
          Frequently Asked Questions
        </h1>
      </div>

      {faqs.length === 0 ? (
        <div className="glass-surface rounded-xl p-8 text-center text-sm text-zinc-400">
          No FAQs published yet.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.id} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-display text-lg font-medium text-white">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#D4AF37]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed pr-6">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-surface rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Still have a question?</h2>
          <p className="text-sm text-zinc-400">Reach out directly through our contact page.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/contact')}
          className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm whitespace-nowrap"
        >
          Contact Us
        </button>
      </div>
    </div>
  );
}
